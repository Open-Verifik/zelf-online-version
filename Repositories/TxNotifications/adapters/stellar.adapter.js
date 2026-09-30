const config = require("../../../Core/config");
const { ProviderError, getJson } = require("./http.util");

/**
 * Stellar via Horizon `/accounts/{id}/payments`, following the paging token.
 * Payments, path payments, account creation (first funding) and merges into the
 * account count as received. Credit assets need a trustline the user opened, so
 * they are not filtered by an allowlist.
 */

const horizonUrl = () => config.txNotifications?.stellarHorizonUrl || "https://horizon.stellar.org";

const trimAmount = (value) => {
    const text = String(value ?? "");
    if (!/^\d+(\.\d+)?$/.test(text)) return null;
    const [whole, fraction = ""] = text.split(".");
    const trimmed = fraction.replace(/0+$/, "");
    return `${BigInt(whole).toString()}${trimmed ? `.${trimmed}` : ""}`;
};

const assetSymbol = (record) => (record.asset_type === "native" ? "XLM" : record.asset_code || null);

/** Horizon payment-like operation record → incoming transfer for `account`, or null. */
const parseStellarRecord = (record, account) => {
    if (!record || record.transaction_successful === false) return null;

    const base = {
        network: "stellar",
        hash: record.transaction_hash,
        timestampMs: Date.parse(record.created_at),
    };
    if (!base.hash || !Number.isFinite(base.timestampMs)) return null;

    switch (record.type) {
        case "payment":
        case "path_payment_strict_receive":
        case "path_payment_strict_send": {
            if (record.to !== account || record.from === account) return null;
            const asset = assetSymbol(record);
            if (!asset) return null;
            return { ...base, amount: trimAmount(record.amount), asset, from: record.from || null, native: record.asset_type === "native" };
        }
        case "create_account": {
            if (record.account !== account || record.funder === account) return null;
            return { ...base, amount: trimAmount(record.starting_balance), asset: "XLM", from: record.funder || null, native: true };
        }
        case "account_merge": {
            // Horizon does not report the merged balance on the operation: amount unknown.
            if (record.into !== account || record.account === account) return null;
            return { ...base, amount: null, asset: "XLM", from: record.account || null, native: true };
        }
        default:
            return null;
    }
};

const fetchPayments = async (account, params) => {
    try {
        return await getJson(`${horizonUrl()}/accounts/${encodeURIComponent(account)}/payments`, { params, label: "horizon" });
    } catch (error) {
        // An account that was never funded does not exist yet: nothing received.
        if (error instanceof ProviderError && error.status === 404) return { _embedded: { records: [] } };
        throw error;
    }
};

const poll = async ({ address, state = {}, seen, minTimestampMs }) => {
    const seeding = !state.cursor;
    const params = seeding
        ? { order: "desc", limit: 20, include_failed: false }
        : { order: "asc", limit: 50, cursor: state.cursor, include_failed: false };

    const page = await fetchPayments(address, params);
    const records = page?._embedded?.records || [];

    let cursor = state.cursor || null;
    if (records.length) cursor = seeding ? records[0].paging_token : records[records.length - 1].paging_token;

    const observed = [];
    const transfers = [];
    const byHash = new Set();

    for (const record of records) {
        const hash = record.transaction_hash;
        if (!hash) continue;
        observed.push(hash);
        if (seen.has(hash) || byHash.has(hash)) continue;
        const transfer = parseStellarRecord(record, address);
        if (!transfer || transfer.timestampMs < minTimestampMs) continue;
        byHash.add(hash);
        transfers.push(transfer);
    }

    return { state: { cursor }, transfers, observed };
};

module.exports = {
    network: "stellar",
    parseStellarRecord,
    poll,
};
