/** Canonical wallet identity is independent of a reservation's `.hold` suffix. */
const referralName = (name) => String(name || "").trim().toLowerCase().replace(/\.hold$/, "");
const recordReferralName = (record) => referralName(record.publicData?.tagName || record.publicData?.zelfName || record.name || record.tagName);

// Older receipts omitted the domain for registration. Check both formats before
// paying, but write the fully qualified key so different domains cannot collide.
const rewardFriendKeys = (name, rewardType) => {
    const fullName = referralName(name);
    return rewardType === "registration" ? [...new Set([`${fullName}.hold`, `${fullName.split(".")[0]}.hold`])] : [fullName];
};

const findReferralRecord = (records, name, rewardType) => {
    const expected = referralName(name);
    const matches = records.filter((record) => recordReferralName(record) === expected);
    if (rewardType === "registration") return matches.find((record) => record.publicData?.type === "hold") || matches[0];
    return matches.find((record) => record.publicData?.type === "mainnet");
};

const groupReferralRecords = (records) => {
    const wallets = new Map();
    for (const record of records) {
        const name = recordReferralName(record);
        if (!name) continue;
        if (!wallets.has(name) || record.publicData?.type === "mainnet") wallets.set(name, record);
    }
    return wallets;
};

const explicitReferralPrice = (record) => {
    const data = record.publicData || {};
    const extra = record.metadata?.extraParams || {};
    if ((data.plan || extra.plan) === "free") return 0;
    const price = data.price ?? extra.price;
    if (price === undefined || price === null || price === "") return null;
    const value = Number(price);
    return Number.isFinite(value) && value >= 0 ? value : 0;
};

module.exports = { referralName, rewardFriendKeys, findReferralRecord, groupReferralRecords, explicitReferralPrice };
