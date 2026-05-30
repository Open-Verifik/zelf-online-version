/**
 * Pinata limits: max 9 keyvalues per pin; each key and value must be < 250 chars.
 * Only filterable / idempotency fields go on the pin; full receipt lives in the JSON file body.
 */
const PINATA_KEYVALUE_MAX_LENGTH = 250;
const PINATA_KEYVALUE_MAX_COUNT = 9;

const buildReceiptSummary = ({
    amount,
    totalTokens,
    bonusPercentage,
    signature,
    licenseExtension,
    licenseExtensionTag,
}) => {
    const summary = {
        a: amount ?? "",
        tk: totalTokens ?? "",
        bp: bonusPercentage ?? "",
    };

    if (signature) summary.tx = signature;

    if (licenseExtension?.extended) {
        summary.ly = licenseExtension.years || 0;
        if (licenseExtension.expiresAt) summary.exp = licenseExtension.expiresAt;
        if (licenseExtensionTag) summary.lt = licenseExtensionTag;
    }

    return JSON.stringify(summary);
};

const parseReceiptSummary = (publicData) => {
    if (!publicData?.receiptSummary) return {};

    try {
        const summary = JSON.parse(publicData.receiptSummary);

        return {
            amountUSD: summary.a,
            totalTokens: summary.tk,
            bonusPercentage: summary.bp,
            transactionSignature: summary.tx,
            licenseExtensionYears: summary.ly,
            licenseExtensionExpiresAt: summary.exp,
            licenseExtensionTag: summary.lt,
        };
    } catch (e) {
        console.error("Error parsing receiptSummary JSON", e);
        return {};
    }
};

const buildPresaleReceiptIpfsMetadata = ({
    sessionId,
    details,
    totalTokens,
    bonusPercentage,
    released,
    address,
    signature,
    zelfName,
    licenseExtension,
}) => {
    const licenseExtended = licenseExtension?.extended === true;
    const licenseExtensionTag =
        licenseExtension?.tagName && licenseExtension?.domain
            ? `${licenseExtension.tagName}.${licenseExtension.domain}`
            : "";

    return {
        type: "presale_receipt",
        presaleSessionId: sessionId,
        presaleEmail: details.email || "",
        presaleZelfName: zelfName || "",
        presaleSolanaAddress: address || "",
        tokensReleased: released ? "true" : "false",
        licenseExtended: licenseExtended ? "true" : "false",
        receiptSummary: buildReceiptSummary({
            amount: details.amount,
            totalTokens,
            bonusPercentage,
            signature,
            licenseExtension,
            licenseExtensionTag,
        }),
    };
};

const validatePresaleReceiptMetadata = (metadata) => {
    const entries = Object.entries(metadata);
    if (entries.length > PINATA_KEYVALUE_MAX_COUNT) {
        console.error("Presale receipt metadata exceeds Pinata keyvalue count limit", {
            count: entries.length,
            max: PINATA_KEYVALUE_MAX_COUNT,
            keys: entries.map(([key]) => key),
        });
        const error = new Error("presale_receipt_metadata_too_many_keys");
        error.status = 400;
        throw error;
    }

    for (const [key, value] of entries) {
        const keyStr = String(key);
        const valueStr = String(value ?? "");
        if (keyStr.length >= PINATA_KEYVALUE_MAX_LENGTH || valueStr.length >= PINATA_KEYVALUE_MAX_LENGTH) {
            console.error("Presale receipt metadata exceeds Pinata keyvalue limit", {
                key: keyStr,
                keyLength: keyStr.length,
                valueLength: valueStr.length,
            });
            const error = new Error("presale_receipt_metadata_too_large");
            error.status = 400;
            throw error;
        }
    }
};

module.exports = {
    PINATA_KEYVALUE_MAX_COUNT,
    PINATA_KEYVALUE_MAX_LENGTH,
    buildReceiptSummary,
    parseReceiptSummary,
    buildPresaleReceiptIpfsMetadata,
    validatePresaleReceiptMetadata,
};
