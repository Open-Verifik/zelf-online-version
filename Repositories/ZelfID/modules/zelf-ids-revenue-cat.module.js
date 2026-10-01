/**
 * RevenueCat webhook for an in-app (App Store / Google Play) Zelf ID purchase.
 *
 * The apps buy a non-renewing store product and tag the RevenueCat customer
 * with `zelfName` ("alice.zelf"), `ethAddress` and `duration`. Customers can
 * rewrite their own attributes with the public SDK key, so the attributes only
 * say WHICH name to extend and who owns it. The store product id is the source
 * of truth for the years paid and the name length the price covers.
 *
 * Product ids seen in the RevenueCat `default` offering:
 *   Google Play: zelf_name_service_char_<bucket>_years_<n>
 *   App Store:   zns_char_<bucket>_years_<n>
 *   (packages:   zns_<bucket>_char_<n>_year)
 * where <bucket> is 1..5, 6_to_15 or 16..27.
 */
const moment = require("moment");
const { getDomainConfig } = require("../../Tags/config/supported-domains");
const { getBareName, getBareNameLength, resolvePaidPlan } = require("./zelf-id-plan.module");

const HANDLED_EVENT_TYPE = "NON_RENEWING_PURCHASE";

const PRODUCT_ID_PATTERNS = [/(?:^|_)char_(\d{1,2}(?:_to_\d{1,2})?)_years?_(\d+|lifetime)$/, /^zns_(\d{1,2}(?:_to_\d{1,2})?)_char_(\d+|lifetime)_years?$/];

/** Reasons RevenueCat should not retry: the event is simply not ours. */
const SKIP_REASONS = new Set(["ignored_event_type", "not_zelf_id_product", "sandbox_event"]);

/**
 * @param {string|number} raw
 * @returns {"1"|"2"|"3"|"4"|"5"|"lifetime"|null}
 */
const productDuration = (raw) => {
    const value = String(raw || "").toLowerCase();
    if (value === "lifetime") return "lifetime";
    const years = Number(value);
    return Number.isInteger(years) && years >= 1 && years <= 5 ? `${years}` : null;
};

/**
 * Length bucket and years encoded in a store product (or package) id.
 * @param {string} productId
 * @returns {{ minLength: number, maxLength: number, duration: string }|null}
 */
const parseZelfIdProductId = (productId) => {
    // Google Play can report "product:base-plan"; only the product part matters.
    const id = String(productId || "")
        .trim()
        .toLowerCase()
        .split(":")[0];

    for (const pattern of PRODUCT_ID_PATTERNS) {
        const match = id.match(pattern);
        if (!match) continue;

        const [minRaw, maxRaw] = match[1].split("_to_");
        const minLength = Number(minRaw);
        const maxLength = maxRaw ? Number(maxRaw) : minLength;
        const duration = productDuration(match[2]);

        if (!duration || !(minLength >= 1) || !(maxLength >= minLength) || maxLength > 27) return null;

        return { minLength, maxLength, duration };
    }

    return null;
};

/**
 * Shorter names cost more, so a product priced for N+ characters can pay for a
 * name of N or more characters (over-payment) but never for a shorter name.
 * @param {{ minLength: number }} product
 * @param {number} nameLength
 * @returns {boolean}
 */
const productCoversNameLength = (product, nameLength) => Boolean(product) && nameLength >= product.minLength && nameLength <= 27;

/**
 * @param {Object} event
 * @returns {Object<string, string>}
 */
const readSubscriberAttributes = (event = {}) => {
    const attributes = {};
    const raw = event.subscriber_attributes || {};

    for (const key of Object.keys(raw)) {
        const entry = raw[key];
        attributes[key] = entry && typeof entry === "object" ? entry.value : entry;
    }

    return attributes;
};

/**
 * `zelfName` is "alice.zelf" (both apps). Older builds may send `tagName` + `domain`.
 * @param {Object<string, string>} attributes
 * @returns {{ tagName: string, domain: string }}
 */
const resolveNameFromAttributes = (attributes = {}) => {
    const full = String(attributes.zelfName || attributes.tagName || "")
        .trim()
        .toLowerCase();
    const parts = full.split(".");
    const tagName = getBareName(full);
    const domain = String(attributes.domain || parts[1] || "zelf")
        .trim()
        .toLowerCase()
        .replace(/^\./, "");

    return { tagName, domain };
};

/**
 * Pure checks on a RevenueCat event, before any registry lookup.
 * @param {Object} event - `body.event` of the RevenueCat webhook
 * @param {Object} [options]
 * @param {boolean} [options.allowSandbox] - credit SANDBOX purchases (never in production)
 * @returns {{ ok: boolean, reason?: string, [key: string]: any }}
 */
const inspectRevenueCatEvent = (event = {}, { allowSandbox = false } = {}) => {
    if (event.type !== HANDLED_EVENT_TYPE) return { ok: false, reason: "ignored_event_type" };

    const product = parseZelfIdProductId(event.product_id);
    if (!product) return { ok: false, reason: "not_zelf_id_product" };

    if (String(event.environment || "").toUpperCase() === "SANDBOX" && !allowSandbox) {
        return { ok: false, reason: "sandbox_event" };
    }

    const attributes = readSubscriberAttributes(event);
    const { tagName, domain } = resolveNameFromAttributes(attributes);

    if (!tagName) return { ok: false, reason: "zelf_name_missing" };

    const nameLength = getBareNameLength(tagName);
    if (!productCoversNameLength(product, nameLength)) {
        return { ok: false, reason: "product_does_not_cover_name", tagName, domain, product };
    }

    const ethAddress = String(attributes.ethAddress || "").trim();
    if (!ethAddress) return { ok: false, reason: "eth_address_missing", tagName, domain };

    const price = Number(event.price);

    return {
        ok: true,
        tagName,
        domain,
        ethAddress,
        duration: product.duration,
        plan: resolvePaidPlan({ tagName }),
        eventId: String(event.id || ""),
        transactionId: String(event.transaction_id || ""),
        price: Number.isFinite(price) && price > 0 ? price : 0,
        purchasedAtMs: Number(event.purchased_at_ms || event.event_timestamp_ms) || null,
        productId: String(event.product_id),
    };
};

/**
 * The record was already rewritten for this purchase (retry or double delivery).
 * A stored `eventID` decides on its own. Pinata trims `eventID` first when the
 * metadata is over 250 characters (renewals), so without it a rewrite after
 * the purchase time counts as applied.
 * @param {Object} publicData
 * @param {{ eventId: string, purchasedAtMs: number|null }} inspected
 * @returns {boolean}
 */
const alreadyAppliedToRecord = (publicData = {}, { eventId, purchasedAtMs }) => {
    if (publicData.eventID) return Boolean(eventId) && publicData.eventID === eventId;
    if (!purchasedAtMs) return false;

    const purchasedAt = moment(purchasedAtMs);
    const after = (value) => Boolean(value) && moment(value).isAfter(purchasedAt);

    return after(publicData.renewedAt) || after(publicData.registeredAt);
};

/**
 * Apply a paid RevenueCat purchase to the Zelf ID (v4 plan stamp + expiry).
 * @param {Object} event - `body.event` of the RevenueCat webhook
 * @param {Object} [options]
 * @param {boolean} [options.allowSandbox]
 * @returns {Promise<Object>}
 */
const confirmRevenueCatPurchase = async (event, { allowSandbox = false } = {}) => {
    const inspected = inspectRevenueCatEvent(event, { allowSandbox });

    if (!inspected.ok) {
        if (SKIP_REASONS.has(inspected.reason)) {
            return { status: "skipped", reason: inspected.reason, confirmed: false };
        }

        throw new Error(`409:${inspected.reason}`);
    }

    const { tagName, domain, ethAddress, duration, plan, eventId, price } = inspected;
    const domainConfig = getDomainConfig(domain);
    const { throwPaymentConfirmationTagNotFound } = require("../../Tags/modules/tag-smart-contract-payment.module");
    const ZelfIdModule = require("./zelf-id.module");
    const { addDurationToTag } = require("./my-zelf-id.module");
    const tagData = await ZelfIdModule.searchTag({ tagName, domain, domainConfig, environment: "all" }, {});

    if (tagData.available || !tagData.tagObject?.publicData) {
        throwPaymentConfirmationTagNotFound(tagName, domain);
    }

    const tagObject = tagData.tagObject;
    const owner = String(tagObject.publicData.ethAddress || "").toLowerCase();

    if (!owner || owner !== ethAddress.toLowerCase()) {
        throw new Error("409:zelfProof_does_not_match");
    }

    if (alreadyAppliedToRecord(tagObject.publicData, inspected)) {
        return {
            status: "success",
            action: "already_extended",
            confirmed: true,
            cache: true,
            tagName,
            domain,
            duration,
            plan,
            expiresAt: tagObject.publicData.expiresAt || null,
        };
    }

    const storedName = String(tagObject.publicData[domainConfig.getTagKey()] || tagName);
    const result = await addDurationToTag(
        {
            tagName: storedName.split(".")[0],
            price,
            domain,
            duration: duration === "lifetime" ? "lifetime" : parseInt(duration, 10),
            plan,
            domainConfig,
            eventID: eventId,
            eventPrice: price,
        },
        tagObject
    );

    return {
        status: "success",
        action: "zelf_id_lease_extended",
        confirmed: true,
        tagName,
        domain,
        duration,
        plan,
        expiresAt: result.expiresAt,
    };
};

module.exports = {
    HANDLED_EVENT_TYPE,
    parseZelfIdProductId,
    productCoversNameLength,
    readSubscriberAttributes,
    resolveNameFromAttributes,
    inspectRevenueCatEvent,
    alreadyAppliedToRecord,
    confirmRevenueCatPurchase,
};
