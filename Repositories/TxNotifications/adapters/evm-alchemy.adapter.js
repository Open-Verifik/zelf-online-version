const config = require("../../../Core/config");
const { formatUnits } = require("../modules/amount.util");
const { NETWORKS } = require("../modules/networks");
const { evmToken } = require("../modules/tokens");
const { jsonRpc, mapWithConcurrency } = require("./http.util");

/**
 * Ethereum / Polygon / Avalanche through Alchemy's Transfers API
 * (`alchemy_getAssetTransfers` with `toAddress`), made incremental with
 * `fromBlock` = cursor + 1. Covers internal (contract) native transfers where
 * Alchemy supports them. Same Alchemy endpoints as Repositories/Alchemy.
 */

const CHAINS = {
    ethereum: { blockTimeMs: 12000, maxRange: 300, categories: ["external", "internal", "erc20"] },
    polygon: { blockTimeMs: 2000, maxRange: 1800, categories: ["external", "internal", "erc20"] },
    // Alchemy serves `internal` only on Ethereum and Polygon.
    avalanche: { blockTimeMs: 2000, maxRange: 1800, categories: ["external", "erc20"] },
};
const MAX_PAGES = 3;
const MAX_CANDIDATES = 25;
const CONFIRMATIONS = 1;

const alchemyUrl = (network) => config.alchemy?.networks?.[network] || null;
const isAlchemyConfigured = (network) => Boolean(CHAINS[network] && alchemyUrl(network));

const hex = (value) => `0x${BigInt(value).toString(16)}`;
const toNumber = (value) => Number(BigInt(value));

/**
 * Alchemy transfer row → candidate transfer, or null for NFTs, uncurated tokens
 * and zero values. Amounts come from `rawContract` (exact), not the float `value`.
 */
const parseAlchemyTransfer = (network, row, owner) => {
    if (!row?.hash || String(row.to || "").toLowerCase() !== owner) return null;
    if (String(row.from || "").toLowerCase() === owner) return null;

    const rawValue = row.rawContract?.value;
    if (!rawValue) return null;
    const raw = BigInt(rawValue);
    if (raw <= 0n) return null;

    const timestampMs = Date.parse(row.metadata?.blockTimestamp);
    const base = { network, hash: row.hash, from: String(row.from || "").toLowerCase() || null, timestampMs: Number.isFinite(timestampMs) ? timestampMs : null };

    if (row.category === "external" || row.category === "internal") {
        return {
            ...base,
            amount: formatUnits(raw, NETWORKS[network].nativeDecimals),
            asset: NETWORKS[network].nativeSymbol,
            native: true,
            category: row.category,
        };
    }

    if (row.category === "erc20") {
        const token = evmToken(network, row.rawContract?.address);
        if (!token) return null;
        return { ...base, amount: formatUnits(raw, token.decimals), asset: token.symbol, native: false, category: row.category };
    }

    return null;
};

const createEvmAlchemyAdapter = (network) => {
    const chain = CHAINS[network];
    if (!chain) throw new Error(`alchemy_unsupported_${network}`);
    const rpc = (method, params) => jsonRpc(alchemyUrl(network), method, params, { label: `${network}_alchemy` });

    const poll = async ({ address, state = {}, seen, minTimestampMs, now }) => {
        const owner = String(address).toLowerCase();
        const latest = toNumber(await rpc("eth_blockNumber", [])) - CONFIRMATIONS;

        let fromBlock;
        if (state.block === undefined || state.block === null) {
            const lookback = Math.min(chain.maxRange, Math.ceil(Math.max(0, now - minTimestampMs) / chain.blockTimeMs) + 5);
            fromBlock = Math.max(0, latest - lookback + 1);
        } else {
            fromBlock = Math.max(Number(state.block) + 1, latest - chain.maxRange + 1);
        }
        if (fromBlock > latest) return { state, transfers: [], observed: [] };

        const rows = [];
        let pageKey;
        for (let page = 0; page < MAX_PAGES; page += 1) {
            const params = {
                fromBlock: hex(fromBlock),
                toBlock: hex(latest),
                toAddress: owner,
                category: chain.categories,
                withMetadata: true,
                excludeZeroValue: true,
                order: "asc",
                maxCount: "0x64",
            };
            if (pageKey) params.pageKey = pageKey;
            const result = await rpc("alchemy_getAssetTransfers", [params]);
            rows.push(...(result?.transfers || []));
            pageKey = result?.pageKey;
            if (!pageKey) break;
        }

        const observed = [];
        const byHash = new Map();
        for (const row of rows) {
            if (!row?.hash) continue;
            observed.push(row.hash);
            if (seen.has(row.hash) || byHash.has(row.hash)) continue;
            const candidate = parseAlchemyTransfer(network, row, owner);
            if (candidate && candidate.timestampMs && candidate.timestampMs >= minTimestampMs) byHash.set(row.hash, candidate);
        }

        // `from` of a token or internal transfer is the token sender / contract, not the
        // transaction sender: drop transfers inside transactions the owner sent (swaps).
        // Newest first, capped (at most 3 pushes + 1 summary per device and cycle anyway).
        const candidates = [...byHash.values()].sort((a, b) => b.timestampMs - a.timestampMs).slice(0, MAX_CANDIDATES);
        const senders = await mapWithConcurrency(candidates, 3, async (t) => {
            if (t.category === "external") return t.from;
            const tx = await rpc("eth_getTransactionByHash", [t.hash]);
            return String(tx?.from || "").toLowerCase();
        });

        const transfers = candidates
            .filter((_, i) => senders[i] && senders[i] !== owner)
            .map(({ category, ...transfer }) => transfer);

        return { state: { block: latest }, transfers, observed };
    };

    return { network, poll };
};

module.exports = {
    CHAINS,
    createEvmAlchemyAdapter,
    isAlchemyConfigured,
    parseAlchemyTransfer,
};
