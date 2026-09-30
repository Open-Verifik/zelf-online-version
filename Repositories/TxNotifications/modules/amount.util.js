/**
 * Exact decimal-string arithmetic for token amounts. Chain APIs return raw
 * integer units (wei, lamports, satoshis, nanotons...), and floats would lose
 * precision on 18-decimal tokens, so everything stays in BigInt until display.
 */

const toBigInt = (value) => {
    if (typeof value === "bigint") return value;
    if (typeof value === "number") {
        if (!Number.isSafeInteger(value)) throw new Error("amount_not_integer");
        return BigInt(value);
    }
    const raw = String(value ?? "").trim();
    if (/^-?\d+$/.test(raw)) return BigInt(raw);
    if (/^0x[0-9a-fA-F]+$/.test(raw)) return BigInt(raw);
    throw new Error("amount_not_integer");
};

/** Raw integer units → trimmed decimal string ("1500000", 6 → "1.5"). */
const formatUnits = (raw, decimals) => {
    const value = toBigInt(raw);
    const places = Number(decimals);
    if (!Number.isInteger(places) || places < 0 || places > 36) throw new Error("amount_bad_decimals");

    const negative = value < 0n;
    const abs = negative ? -value : value;
    if (places === 0) return `${negative ? "-" : ""}${abs.toString()}`;

    const text = abs.toString().padStart(places + 1, "0");
    const whole = text.slice(0, text.length - places);
    const fraction = text.slice(text.length - places).replace(/0+$/, "");

    return `${negative ? "-" : ""}${whole}${fraction ? `.${fraction}` : ""}`;
};

/** Decimal string → raw integer units, truncating extra precision. */
const parseUnits = (decimal, decimals) => {
    const text = String(decimal ?? "").trim();
    if (!/^-?\d+(\.\d+)?$/.test(text)) throw new Error("amount_not_decimal");

    const negative = text.startsWith("-");
    const [whole, fraction = ""] = text.replace(/^-/, "").split(".");
    const padded = (fraction + "0".repeat(decimals)).slice(0, decimals);
    const value = BigInt(`${whole}${padded}` || "0");

    return negative ? -value : value;
};

const DECIMAL_RE = /^\d+(\.\d+)?$/;

/** Compares two non-negative decimal strings: -1, 0 or 1. */
const compareDecimal = (left, right) => {
    if (!DECIMAL_RE.test(String(left)) || !DECIMAL_RE.test(String(right))) throw new Error("amount_not_decimal");

    const [leftWhole, leftFraction = ""] = String(left).split(".");
    const [rightWhole, rightFraction = ""] = String(right).split(".");
    const places = Math.max(leftFraction.length, rightFraction.length);
    const a = BigInt(leftWhole + leftFraction.padEnd(places, "0"));
    const b = BigInt(rightWhole + rightFraction.padEnd(places, "0"));

    if (a === b) return 0;
    return a > b ? 1 : -1;
};

const isPositiveDecimal = (value) => DECIMAL_RE.test(String(value ?? "")) && compareDecimal(String(value), "0") > 0;

/**
 * Short amount for a notification line: at most 8 decimals, trailing zeros
 * trimmed, and never rounded down to "0" (tiny amounts keep their digits).
 */
const displayAmount = (decimal) => {
    const text = String(decimal ?? "");
    if (!DECIMAL_RE.test(text)) return null;

    const [whole, fraction = ""] = text.split(".");
    const cut = fraction.slice(0, 8).replace(/0+$/, "");
    const short = cut ? `${BigInt(whole).toString()}.${cut}` : BigInt(whole).toString();

    if (short === "0" && /[1-9]/.test(fraction)) {
        return `0.${fraction.replace(/0+$/, "")}`;
    }

    return short;
};

module.exports = {
    compareDecimal,
    displayAmount,
    formatUnits,
    isPositiveDecimal,
    parseUnits,
    toBigInt,
};
