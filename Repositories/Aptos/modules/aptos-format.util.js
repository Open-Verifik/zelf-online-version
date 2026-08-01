const APTOS_DECIMALS = 8;
const OCTAS_PER_APT = 10n ** BigInt(APTOS_DECIMALS);

const expandScientificNotation = (value) => {
    const stringValue = String(value || "0");
    if (!/[eE]/.test(stringValue)) return stringValue;

    const [coefficient, exponentPart] = stringValue.toLowerCase().split("e");
    const exponent = Number(exponentPart);
    if (!Number.isInteger(exponent)) return stringValue;

    const negative = coefficient.startsWith("-");
    const unsigned = negative ? coefficient.slice(1) : coefficient;
    const [whole, fraction = ""] = unsigned.split(".");
    const digits = `${whole}${fraction}`;
    const decimalPosition = whole.length + exponent;

    let expanded;
    if (decimalPosition <= 0) expanded = `0.${"0".repeat(Math.abs(decimalPosition))}${digits}`;
    else if (decimalPosition >= digits.length) expanded = `${digits}${"0".repeat(decimalPosition - digits.length)}`;
    else expanded = `${digits.slice(0, decimalPosition)}.${digits.slice(decimalPosition)}`;

    return negative ? `-${expanded}` : expanded;
};

const atomicToDecimalString = (value, decimals = APTOS_DECIMALS) => {
    const expanded = expandScientificNotation(value);
    if (!/^-?\d+$/.test(expanded)) return "0";

    const atomic = BigInt(expanded);
    const negative = atomic < 0n;
    const absolute = negative ? -atomic : atomic;
    const scale = 10n ** BigInt(decimals);
    const whole = absolute / scale;
    const fraction = (absolute % scale).toString().padStart(decimals, "0").replace(/0+$/, "");
    const result = fraction ? `${whole}.${fraction}` : whole.toString();

    return negative ? `-${result}` : result;
};

const decimalToAtomicString = (value, decimals = APTOS_DECIMALS) => {
    const normalized = String(value ?? "").trim();
    if (!/^\d+(\.\d+)?$/.test(normalized)) {
        const error = new Error("aptos_amount_invalid");
        error.status = 400;
        throw error;
    }

    const [whole, fraction = ""] = normalized.split(".");
    if (fraction.length > decimals) {
        const error = new Error(`aptos_amount_exceeds_${decimals}_decimals`);
        error.status = 400;
        throw error;
    }

    const atomic = BigInt(whole) * 10n ** BigInt(decimals) + BigInt((fraction || "").padEnd(decimals, "0") || "0");
    if (atomic <= 0n) {
        const error = new Error("aptos_amount_must_be_greater_than_zero");
        error.status = 400;
        throw error;
    }

    return atomic.toString();
};

const aptosFeeFromGas = (gasUsed, gasUnitPrice) => {
    const feeOctas = BigInt(String(gasUsed || "0")) * BigInt(String(gasUnitPrice || "0"));
    return {
        feeOctas: feeOctas.toString(),
        feeApt: atomicToDecimalString(feeOctas, APTOS_DECIMALS),
    };
};

const calculateFiatBalance = (amount, price) => {
    const fiat = Number(amount || 0) * Number(price || 0);
    return Number.isFinite(fiat) ? parseFloat(fiat.toFixed(4)) : 0;
};

module.exports = {
    APTOS_DECIMALS,
    OCTAS_PER_APT,
    atomicToDecimalString,
    decimalToAtomicString,
    aptosFeeFromGas,
    calculateFiatBalance,
    expandScientificNotation,
};
