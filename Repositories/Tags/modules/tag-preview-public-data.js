// Search metadata on legacy pins can omit addresses that remain in the proof.
// Only fill public address fields from the preview of that record's own proof.
const ADDRESS_FIELDS = [
    "ethAddress", "evmAddress", "solanaAddress", "btcAddress", "suiAddress", "xlmAddress",
    "kusamaAddress", "polkadotAddress", "tonAddress", "aptosAddress",
];
const value = (input) => typeof input === "string" ? input.trim() : "";
const canonicalName = (input) => value(input).toLowerCase().replace(/\.hold$/, "");
const owner = (data) => value(data?.ethAddress) || value(data?.evmAddress);
const hasMissingOwner = (publicData) => !owner(publicData);
const sameAddress = (left, right) => /^0x/i.test(left) && /^0x/i.test(right)
    ? left.toLowerCase() === right.toLowerCase()
    : left === right;

const applyPreviewPublicData = (tagObject, preview) => {
    const stored = tagObject?.publicData;
    const recovered = preview?.publicData;
    if (!stored || !recovered) return tagObject;

    const storedName = canonicalName(stored.tagName || stored.zelfName || tagObject.name);
    const proofName = canonicalName(recovered.tagName || recovered.zelfName);
    if (!storedName || storedName !== proofName) return tagObject;
    if (stored.domain && recovered.domain &&
        value(stored.domain).toLowerCase() !== value(recovered.domain).toLowerCase()) return tagObject;

    // Conflicting metadata must not produce an identity assembled from two wallets.
    if (owner(stored) && owner(recovered) && !sameAddress(owner(stored), owner(recovered))) return tagObject;
    for (const field of ADDRESS_FIELDS) {
        if (value(stored[field]) && value(recovered[field]) &&
            !sameAddress(value(stored[field]), value(recovered[field]))) return tagObject;
    }
    for (const field of ADDRESS_FIELDS) {
        if (!value(stored[field]) && value(recovered[field])) stored[field] = value(recovered[field]);
    }
    return tagObject;
};

module.exports = { hasMissingOwner, applyPreviewPublicData };
