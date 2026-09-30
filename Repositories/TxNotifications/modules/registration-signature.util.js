const { verifyMessage } = require("ethers");

/**
 * Canonical message the app signs (EIP-191 personal_sign) with the wallet's EVM
 * key to register a device (contract #566, section 1):
 *
 *   Zelf tx notifications v1
 *   push=<pushSubscriptionId>
 *   platform=<platform>
 *   issuedAt=<issuedAt>
 *   <network>=<address>      one line per address, sorted by network key
 *
 * `\n` separators, no trailing newline, values used exactly as sent. Keys are
 * sorted by plain code-unit order (they are lowercase ASCII).
 */
const MESSAGE_HEADER = "Zelf tx notifications v1";
const MAX_CLOCK_SKEW_MS = 10 * 60 * 1000;
const ISO_UTC_RE = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d{1,9})?Z$/;

const buildRegistrationMessage = ({ pushSubscriptionId, platform, issuedAt, addresses }) => {
    const keys = Object.keys(addresses || {}).sort();
    return [
        MESSAGE_HEADER,
        `push=${pushSubscriptionId}`,
        `platform=${platform}`,
        `issuedAt=${issuedAt}`,
        ...keys.map((key) => `${key}=${addresses[key]}`),
    ].join("\n");
};

/** True when the EIP-191 signature over the canonical message recovers `addresses.ethereum`. */
const verifyRegistrationSignature = (body) => {
    try {
        const expected = String(body?.addresses?.ethereum || "").toLowerCase();
        if (!expected) return false;
        const recovered = verifyMessage(buildRegistrationMessage(body), body.signature);
        return recovered.toLowerCase() === expected;
    } catch (_) {
        return false;
    }
};

/** Milliseconds since epoch for a strict ISO-8601 UTC timestamp, or null. */
const parseIssuedAt = (issuedAt) => {
    if (typeof issuedAt !== "string" || !ISO_UTC_RE.test(issuedAt)) return null;
    const ms = Date.parse(issuedAt);
    return Number.isFinite(ms) ? ms : null;
};

/** `issuedAt` must be within ±10 minutes of server time. */
const isFresh = (issuedAt, now = Date.now(), maxSkewMs = MAX_CLOCK_SKEW_MS) => {
    const ms = parseIssuedAt(issuedAt);
    return ms !== null && Math.abs(now - ms) <= maxSkewMs;
};

module.exports = {
    MAX_CLOCK_SKEW_MS,
    MESSAGE_HEADER,
    buildRegistrationMessage,
    isFresh,
    parseIssuedAt,
    verifyRegistrationSignature,
};
