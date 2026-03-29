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

/**
 * USD (decimal string) → atomic units for a stablecoin with `decimals` (e.g. 6 on Avalanche USDC, 18 on BSC USDC/USDT).
 * Uses floor(usd * 10^decimals) via fixed-point 18 for usdPrice input.
 * @param {string|number} usdPrice
 * @param {number} decimals
 * @returns {bigint}
 */
const stableAtomicFromUsd = (usdPrice, decimals) => {
    const d = Number(decimals);
    if (!Number.isFinite(d) || d < 0 || d > 36) {
        throw new Error("invalid_decimals");
    }
    const usdScaled = parseUnits(decimalStringForParseUnits(usdPrice), 18);
    const shift = 18 - d;
    if (shift < 0) {
        throw new Error("invalid_decimals");
    }
    return usdScaled / 10n ** BigInt(shift);
};

module.exports = {
    decimalStringForParseUnits,
    usdcAtomicFromUsd,
    stableAtomicFromUsd,
};
