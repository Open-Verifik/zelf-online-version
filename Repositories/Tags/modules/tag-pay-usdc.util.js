const { parseUnits } = require("ethers");

/**
 * Decimal string safe for ethers.parseUnits (avoids float round-trip on exchange rates).
 * @param {string|number} v
 * @returns {string}
 */
const decimalStringForParseUnits = (v) => {
    if (typeof v === "number" && Number.isFinite(v)) {
        const s = v.toFixed(18).replace(/\.?0+$/, "");
        return s === "" ? "0" : s;
    }
    return String(v).trim();
};

/**
 * USDC (6 decimals): floor(usd * 1e6) from 18-decimal USD fixed representation.
 * @param {string|number} usdPrice
 * @returns {bigint}
 */
const usdcAtomicFromUsd = (usdPrice) => {
    const usdScaled = parseUnits(decimalStringForParseUnits(usdPrice), 18);
    return usdScaled / 10n ** 12n;
};

module.exports = {
    decimalStringForParseUnits,
    usdcAtomicFromUsd,
};
