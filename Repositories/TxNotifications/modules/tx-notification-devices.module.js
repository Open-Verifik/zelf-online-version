const crypto = require("crypto");

const config = require("../../../Core/config");
const Device = require("../models/tx-notification-device.model");
const Cursor = require("../models/tx-watch-cursor.model");
const { invalidRequest, invalidSecret, invalidSignature, staleRequest } = require("./tx-notifications-errors");
const { isFresh, parseIssuedAt, verifyRegistrationSignature } = require("./registration-signature.util");
const { isValidPushSubscriptionId, parseRegistrationBody, resolveAddresses } = require("./registration-input.util");

const DAY_MS = 24 * 60 * 60 * 1000;

const sha256Hex = (value) => crypto.createHash("sha256").update(String(value)).digest("hex");

const staleAfter = (from) => new Date(from.getTime() + (config.txNotifications?.deviceStaleDays || 60) * DAY_MS);

const secretMatches = (secret, secretHash) => {
    const actual = Buffer.from(sha256Hex(secret), "hex");
    const expected = Buffer.from(String(secretHash || ""), "hex");
    return expected.length === actual.length && crypto.timingSafeEqual(actual, expected);
};

/** Creates cursors for newly watched accounts; existing cursors (and their seen history) are kept. */
const ensureCursors = async (addresses, now) => {
    const operations = addresses
        .filter((entry) => entry.watched)
        .map((entry) => ({
            updateOne: {
                filter: { key: entry.key },
                update: {
                    $setOnInsert: {
                        key: entry.key,
                        network: entry.network,
                        queryAddress: entry.queryAddress,
                        seededAt: null,
                        state: {},
                        seen: [],
                        nextCheckAt: now,
                        errorCount: 0,
                    },
                },
                upsert: true,
            },
        }));

    if (operations.length) await Cursor.bulkWrite(operations, { ordered: false });
};

/**
 * Register or update a device (contract #566 §1). Checks, in order: request
 * shape (400), signature recovers `addresses.ethereum` (401 invalid_signature),
 * `issuedAt` within ±10 min and newer than the last registration of this
 * subscription (401 stale_request), every address valid for its network (400).
 */
const registerDevice = async (body, { now = new Date() } = {}) => {
    const input = parseRegistrationBody(body);

    if (!verifyRegistrationSignature(input)) throw invalidSignature();
    if (!isFresh(input.issuedAt, now.getTime())) throw staleRequest();

    const addresses = resolveAddresses(input.addresses);
    const issuedAt = new Date(parseIssuedAt(input.issuedAt));
    const ownerEth = input.addresses.ethereum.toLowerCase();

    const existing = await Device.findOne({ pushSubscriptionId: input.pushSubscriptionId }).lean();

    if (existing && issuedAt.getTime() <= new Date(existing.lastIssuedAt).getTime()) {
        throw staleRequest("issuedAt must be newer than the current registration");
    }

    // Keep the registration time of accounts this device already watched, so a
    // re-registration (e.g. a network toggled) never drops a transfer in flight.
    const keepSince = existing && existing.enabled && existing.ownerEth === ownerEth;
    const previousSince = new Map(keepSince ? (existing.addresses || []).map((entry) => [entry.key, entry.since]) : []);

    const deviceSecret = crypto.randomBytes(32).toString("hex");
    const storedAddresses = addresses.map(({ network, address, key }) => ({
        network,
        address,
        key,
        since: previousSince.get(key) || now,
    }));
    const watchKeys = addresses.filter((entry) => entry.watched).map((entry) => entry.key);

    const update = {
        $set: {
            platform: input.platform,
            language: input.language,
            appVersion: input.appVersion,
            tagName: input.tagName,
            ownerEth,
            addresses: storedAddresses,
            watchKeys,
            enabled: true,
            disabledReason: null,
            disabledAt: null,
            secretHash: sha256Hex(deviceSecret),
            lastIssuedAt: issuedAt,
            lastSeenAt: now,
            expiresAt: staleAfter(now),
        },
        $setOnInsert: { pushSubscriptionId: input.pushSubscriptionId, registeredAt: now },
    };

    // Two registrations racing on the same subscription both pass the lookup;
    // the conditional filter makes the older issuedAt lose instead of overwrite.
    const filter = existing
        ? { pushSubscriptionId: input.pushSubscriptionId, lastIssuedAt: { $lt: issuedAt } }
        : { pushSubscriptionId: input.pushSubscriptionId };

    let device;
    try {
        device = await Device.findOneAndUpdate(filter, update, { upsert: !existing, new: true, lean: true });
    } catch (error) {
        if (error?.code === 11000) throw staleRequest("a newer registration for this subscription was accepted");
        throw error;
    }
    if (!device) throw staleRequest("a newer registration for this subscription was accepted");

    await ensureCursors(addresses, now);

    return {
        deviceId: String(device._id),
        deviceSecret,
        watching: [...new Set(addresses.filter((entry) => entry.watched).map((entry) => entry.network))].sort(),
    };
};

/** Unregister (contract #566 §2). `removed: false` when the subscription is not registered. */
const unregisterDevice = async (pushSubscriptionId, deviceSecret) => {
    if (!isValidPushSubscriptionId(pushSubscriptionId)) throw invalidRequest("pushSubscriptionId is malformed");
    if (typeof deviceSecret !== "string" || !/^[0-9a-fA-F]{64,128}$/.test(deviceSecret)) throw invalidSecret();

    const device = await Device.findOne({ pushSubscriptionId }).lean();
    if (!device) return { removed: false };
    if (!secretMatches(deviceSecret.toLowerCase(), device.secretHash)) throw invalidSecret();

    const { deletedCount } = await Device.deleteOne({ _id: device._id, secretHash: device.secretHash });

    return { removed: deletedCount === 1 };
};

module.exports = {
    registerDevice,
    secretMatches,
    sha256Hex,
    unregisterDevice,
};
