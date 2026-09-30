const config = require("../../../Core/config");
const { formatUnits } = require("../modules/amount.util");
const { NETWORKS } = require("../modules/networks");
const { evmToken, evmTokenContracts } = require("../modules/tokens");
const { ProviderError, jsonRpc, mapWithConcurrency } = require("./http.util");

/**
 * EVM networks over plain JSON-RPC (BSC always; Ethereum, Polygon and Avalanche
 * when Alchemy is not configured or refuses the call). No explorer API needed:
 *
 * - Curated ERC-20/BEP-20: `eth_getLogs` for Transfer(*, owner) on the curated
 *   token contracts, from the block after the cursor to the chain head.
 * - Native coin: balance and nonce are compared with the cursor; only when one
 *   changed are the new blocks scanned for transactions to the owner. Transfers
 *   made by contracts (internal transactions) are not visible this way.
 */

const TRANSFER_TOPIC = "0xddf252ad1be2c89b69c2b068fc378daa952ba7f163c4a11628f55a4df523b3ef";

const CHAINS = {
    ethereum: { blockTimeMs: 12000, confirmations: 1, maxRange: 300, maxNativeScan: 60, publicRpc: "https://ethereum-rpc.publicnode.com" },
    polygon: { blockTimeMs: 2000, confirmations: 3, maxRange: 1800, maxNativeScan: 300, publicRpc: "https://polygon-bor-rpc.publicnode.com" },
    avalanche: { blockTimeMs: 2000, confirmations: 2, maxRange: 1800, maxNativeScan: 300, publicRpc: "https://avalanche-c-chain-rpc.publicnode.com" },
    bsc: { blockTimeMs: 750, confirmations: 3, maxRange: 4800, maxNativeScan: 600, publicRpc: "https://bsc-rpc.publicnode.com" },
};
const LOG_CHUNK = 1000;
const MAX_CANDIDATES = 25;

const rpcUrls = (network) =>
    [...new Set([
        ...(config.txNotifications?.evmRpcUrls?.[network] || []),
        network === "bsc" ? config.bsc?.rpcUrl : null,
        config.rpc?.chains?.[network]?.rpcUrl,
        CHAINS[network].publicRpc,
    ].filter(Boolean))];

/** Tries each endpoint in order; a JSON-RPC error or an HTTP failure moves to the next one. */
const rpcFor = (network) => async (method, params) => {
    let lastError;
    for (const url of rpcUrls(network)) {
        try {
            return await jsonRpc(url, method, params, { label: `${network}_rpc` });
        } catch (error) {
            lastError = error;
        }
    }
    throw lastError;
};

const hex = (value) => `0x${BigInt(value).toString(16)}`;
const toNumber = (value) => Number(BigInt(value));
const topicAddress = (topic) => `0x${String(topic).slice(-40)}`.toLowerCase();
const padTopic = (address) => `0x${"0".repeat(24)}${address.slice(2).toLowerCase()}`;

/** Transfer log → candidate token transfer, or null for uncurated contracts / zero amounts. */
const parseTransferLog = (network, log) => {
    const token = evmToken(network, log?.address);
    if (!token || log.removed) return null;
    const raw = BigInt(log.data && log.data !== "0x" ? log.data : "0x0");
    if (raw <= 0n) return null;
    return {
        network,
        hash: log.transactionHash,
        amount: formatUnits(raw, token.decimals),
        asset: token.symbol,
        from: topicAddress(log.topics[1]),
        blockNumber: toNumber(log.blockNumber),
        timestampMs: log.blockTimestamp ? toNumber(log.blockTimestamp) * 1000 : null,
        native: false,
    };
};

/** Full block → native transfers to `owner` (value > 0, not sent by the owner). */
const nativeTransfersInBlock = (network, block, owner) => {
    const timestampMs = toNumber(block.timestamp) * 1000;
    return (block.transactions || [])
        .filter((tx) => typeof tx === "object" && String(tx.to || "").toLowerCase() === owner && String(tx.from || "").toLowerCase() !== owner)
        .filter((tx) => BigInt(tx.value || "0x0") > 0n)
        .map((tx) => ({
            network,
            hash: tx.hash,
            amount: formatUnits(BigInt(tx.value), NETWORKS[network].nativeDecimals),
            asset: NETWORKS[network].nativeSymbol,
            from: String(tx.from).toLowerCase(),
            blockNumber: toNumber(block.number),
            timestampMs,
            native: true,
        }));
};

const createEvmRpcAdapter = (network) => {
    const chain = CHAINS[network];
    if (!chain) throw new Error(`evm_rpc_unsupported_${network}`);
    const rpc = rpcFor(network);

    const fetchTokenLogs = async (owner, fromBlock, toBlock) => {
        const contracts = evmTokenContracts(network);
        if (!contracts.length || fromBlock > toBlock) return [];
        const logs = [];
        for (let start = fromBlock; start <= toBlock; start += LOG_CHUNK) {
            const end = Math.min(toBlock, start + LOG_CHUNK - 1);
            const chunk = await rpc("eth_getLogs", [
                { address: contracts, fromBlock: hex(start), toBlock: hex(end), topics: [TRANSFER_TOPIC, null, padTopic(owner)] },
            ]);
            logs.push(...(chunk || []));
        }
        return logs;
    };

    const accountAt = async (owner, blockTag) => {
        const [balance, nonce] = await Promise.all([rpc("eth_getBalance", [owner, blockTag]), rpc("eth_getTransactionCount", [owner, blockTag])]);
        return { balance: BigInt(balance).toString(), nonce: toNumber(nonce) };
    };

    const poll = async ({ address, state = {}, seen, minTimestampMs, now }) => {
        const owner = String(address).toLowerCase();
        // A few blocks behind the head: absorbs small reorgs and endpoints that lag the one that answered.
        const latest = toNumber(await rpc("eth_blockNumber", [])) - chain.confirmations;

        let fromBlock;
        let baseline = null;
        let nativeFrom;

        if (state.block === undefined || state.block === null) {
            // Seed: look back to the registration time so a transfer that landed
            // before the first poll is still found, within the flood caps.
            const lookback = Math.min(chain.maxRange, Math.ceil(Math.max(0, now - minTimestampMs) / chain.blockTimeMs) + 5);
            fromBlock = Math.max(0, latest - lookback + 1);
            nativeFrom = fromBlock;
            try {
                baseline = await accountAt(owner, hex(Math.max(0, fromBlock - 1)));
            } catch (_) {
                baseline = null; // node without that historical state: native starts at the head
            }
        } else {
            fromBlock = Number(state.block) + 1;
            nativeFrom = fromBlock;
            if (state.balance !== undefined && state.nonce !== undefined) baseline = { balance: state.balance, nonce: state.nonce };
        }

        if (fromBlock > latest) return { state, transfers: [], observed: [] };

        if (latest - fromBlock + 1 > chain.maxRange) {
            fromBlock = latest - chain.maxRange + 1;
            nativeFrom = fromBlock;
            baseline = null; // too far behind: skip native history for the gap
        }

        const head = await accountAt(owner, hex(latest));
        const candidates = (await fetchTokenLogs(owner, fromBlock, latest)).map((log) => parseTransferLog(network, log)).filter(Boolean);

        const nativeChanged = baseline && (baseline.balance !== head.balance || baseline.nonce !== head.nonce);
        if (nativeChanged && latest - nativeFrom + 1 <= chain.maxNativeScan) {
            const numbers = Array.from({ length: latest - nativeFrom + 1 }, (_, i) => nativeFrom + i);
            const blocks = await mapWithConcurrency(numbers, 4, (n) => rpc("eth_getBlockByNumber", [hex(n), true]));
            for (const block of blocks) if (block) candidates.push(...nativeTransfersInBlock(network, block, owner));
        }

        const observed = [];
        const fresh = [];
        const byHash = new Set();
        for (const candidate of candidates) {
            observed.push(candidate.hash);
            if (seen.has(candidate.hash) || byHash.has(candidate.hash)) continue;
            byHash.add(candidate.hash);
            fresh.push(candidate);
        }

        // Block timestamps for logs from nodes that do not include `blockTimestamp` (newest blocks only).
        const missing = [...new Set(fresh.filter((t) => !t.timestampMs).map((t) => t.blockNumber))].sort((a, b) => b - a).slice(0, MAX_CANDIDATES);
        const headers = await mapWithConcurrency(missing, 4, (n) => rpc("eth_getBlockByNumber", [hex(n), false]));
        const timeByBlock = new Map(missing.map((n, i) => [n, headers[i] ? toNumber(headers[i].timestamp) * 1000 : null]));

        // Newest first, capped: a device gets at most 3 pushes + 1 summary per cycle anyway,
        // and each candidate costs one lookup for the own-send check.
        const inWindow = fresh
            .map((t) => ({ ...t, timestampMs: t.timestampMs || timeByBlock.get(t.blockNumber) || null }))
            .filter((t) => t.timestampMs && t.timestampMs >= minTimestampMs)
            .sort((a, b) => b.blockNumber - a.blockNumber)
            .slice(0, MAX_CANDIDATES);

        // Own sends: a token arriving in a transaction the owner sent (a swap) is not "received";
        // a native transfer must also have succeeded.
        const checks = await mapWithConcurrency(inWindow, 3, async (t) => {
            if (t.native) {
                const receipt = await rpc("eth_getTransactionReceipt", [t.hash]);
                return receipt && BigInt(receipt.status || "0x0") === 1n;
            }
            const tx = await rpc("eth_getTransactionByHash", [t.hash]);
            return tx && String(tx.from || "").toLowerCase() !== owner;
        });

        const transfers = inWindow.filter((_, i) => checks[i]).map(({ blockNumber, ...transfer }) => transfer);

        return { state: { block: latest, balance: head.balance, nonce: head.nonce }, transfers, observed };
    };

    return { network, poll, rpcUrls: () => rpcUrls(network) };
};

module.exports = {
    CHAINS,
    TRANSFER_TOPIC,
    createEvmRpcAdapter,
    nativeTransfersInBlock,
    padTopic,
    parseTransferLog,
};
