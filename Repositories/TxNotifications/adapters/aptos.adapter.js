const config = require("../../../Core/config");
const { formatUnits } = require("../modules/amount.util");
const { aptosAsset } = require("../modules/tokens");
const { ProviderError, getJson, mapWithConcurrency, postJson } = require("./http.util");

/**
 * Aptos via the Indexer (`fungible_asset_activities` deposits into the owner,
 * after the last processed transaction version) plus the fullnode for the
 * transaction hash and sender of each new deposit. Only APT and curated
 * stablecoins are announced; deposits from transactions the owner sent
 * (swaps, self transfers) are ignored.
 */

const DEPOSIT_TYPES = ["0x1::coin::DepositEvent", "0x1::coin::CoinDeposit", "0x1::fungible_asset::Deposit"];
const MAX_DETAIL_LOOKUPS = 10;

const indexerUrl = () => String(config.aptos?.indexerUrl || "").trim() || "https://api.mainnet.aptoslabs.com/v1/graphql";
const fullnodeUrl = () => (String(config.aptos?.fullnodeUrl || "").trim() || "https://api.mainnet.aptoslabs.com/v1").replace(/\/$/, "");
const authHeaders = () => (config.aptos?.apiKey ? { Authorization: `Bearer ${config.aptos.apiKey}` } : undefined);

// Same filter and order as the history module (Repositories/Aptos/modules/aptos-scrapping.module.js),
// which the indexer serves from its owner index. Extra server-side filters (type, version range,
// success) made the public indexer time out (408) on busy accounts, so they are applied here.
const ACTIVITIES_QUERY = `
query TxWatcherAptosActivities($address: String!, $limit: Int!) {
  fungible_asset_activities(
    where: { owner_address: { _eq: $address }, is_gas_fee: { _eq: false } }
    order_by: [{ transaction_version: desc }, { event_index: desc }]
    limit: $limit
  ) {
    transaction_version
    transaction_timestamp
    amount
    asset_type
    type
    is_transaction_success
  }
}`;

const longAddress = (value) => {
    const hex = String(value || "").toLowerCase().replace(/^0x/, "");
    return /^[0-9a-f]{1,64}$/.test(hex) ? `0x${hex.padStart(64, "0")}` : null;
};

const parseTimestamp = (value) => {
    const raw = String(value || "");
    const ms = Date.parse(/[zZ]|[+-]\d\d:?\d\d$/.test(raw) ? raw : `${raw}Z`);
    return Number.isFinite(ms) ? ms : null;
};

/**
 * First curated deposit of each successful transaction version. `seenId` is the
 * version (known before the hash lookup, so already-seen versions cost nothing).
 */
const depositsByVersion = (activities) => {
    const byVersion = new Map();
    for (const activity of activities || []) {
        const version = String(activity?.transaction_version ?? "");
        if (!version || byVersion.has(version)) continue;
        if (!DEPOSIT_TYPES.includes(activity.type) || activity.is_transaction_success === false) continue;
        const asset = aptosAsset(activity.asset_type);
        if (!asset) continue;
        const raw = BigInt(String(activity.amount ?? "0"));
        if (raw <= 0n) continue;
        byVersion.set(version, {
            version,
            seenId: `v${version}`,
            amount: formatUnits(raw, asset.decimals),
            asset: asset.symbol,
            native: Boolean(asset.native),
            timestampMs: parseTimestamp(activity.transaction_timestamp),
        });
    }
    return [...byVersion.values()];
};

/** Deposit + fullnode transaction → transfer, or null when the owner sent the transaction. */
const toAptosTransfer = (deposit, transaction, owner) => {
    if (!transaction?.hash || transaction.success === false) return null;
    const sender = longAddress(transaction.sender);
    if (sender && sender === owner) return null;
    return {
        network: "aptos",
        hash: transaction.hash,
        seenId: deposit.seenId,
        amount: deposit.amount,
        asset: deposit.asset,
        from: sender,
        timestampMs: deposit.timestampMs || Math.floor(Number(transaction.timestamp) / 1000),
        native: deposit.native,
    };
};

const fetchActivities = async (owner, limit) => {
    const data = await postJson(indexerUrl(), { query: ACTIVITIES_QUERY, variables: { address: owner, limit } }, { headers: authHeaders(), label: "aptos_indexer" });
    if (data?.errors?.length) throw new ProviderError("aptos_indexer_graphql_error");
    return data?.data?.fungible_asset_activities || [];
};

const fetchTransaction = (version) =>
    getJson(`${fullnodeUrl()}/transactions/by_version/${encodeURIComponent(version)}`, { headers: authHeaders(), label: "aptos_fullnode" });

const poll = async ({ address, state = {}, seen, minTimestampMs }) => {
    const owner = longAddress(address);
    if (!owner) throw new ProviderError("aptos_bad_address", { retryable: false });

    const seeding = state.version === undefined || state.version === null;
    const lastVersion = BigInt(seeding ? "0" : String(state.version));
    const activities = (await fetchActivities(owner, 25)).filter((activity) => BigInt(String(activity.transaction_version)) > lastVersion);

    let version = lastVersion;
    for (const activity of activities) {
        const current = BigInt(String(activity.transaction_version));
        if (current > version) version = current;
    }

    const deposits = depositsByVersion(activities);
    const observed = deposits.map((deposit) => deposit.seenId);
    const candidates = deposits
        .filter((deposit) => !seen.has(deposit.seenId) && deposit.timestampMs !== null && deposit.timestampMs >= minTimestampMs)
        .slice(0, MAX_DETAIL_LOOKUPS);

    const transactions = await mapWithConcurrency(candidates, 3, (deposit) => fetchTransaction(deposit.version));
    const transfers = candidates.map((deposit, i) => toAptosTransfer(deposit, transactions[i], owner)).filter(Boolean);

    return { state: { version: version.toString() }, transfers, observed };
};

module.exports = {
    ACTIVITIES_QUERY,
    DEPOSIT_TYPES,
    depositsByVersion,
    network: "aptos",
    poll,
    toAptosTransfer,
};
