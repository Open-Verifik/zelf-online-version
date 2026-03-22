const { getCleanInstance } = require("../../../Core/axios");
const { generateRandomUserAgent } = require("../../../Core/helpers");
const { getTickerPrice } = require("../../binance/modules/binance.module");
const instance = getCleanInstance(30000);
const SATOSHI_TO_BTC = 100000000;

const MEMPOOL_BASE = "https://mempool.space/api";
const BLOCKSTREAM_BASE = "https://blockstream.info/api";

const makeApiRequest = async (url) => {
    const { data } = await instance.get(url, {
        headers: {
            "user-agent": generateRandomUserAgent(),
        },
    });
    return data;
};

const convertSatoshiToBTC = (satoshi) => satoshi / SATOSHI_TO_BTC;

// Extract transaction data from esplora (mempool.space / Blockstream) format
function extractTransactionDataFromBlockstream(transactions) {
    return transactions.map((tx) => {
        const relevantOutputs = tx.vout.filter((vout) => vout.scriptpubkey_address);

        const fromAddress = tx.vin?.[0]?.prevout?.scriptpubkey_address || "";
        const toAddresses = relevantOutputs.map((vout) => vout.scriptpubkey_address).filter(Boolean);

        const amountSats = relevantOutputs.reduce((sum, vout) => sum + (vout.value || 0), 0);
        const amountBTC = amountSats / 1e8;

        return {
            amount: amountBTC,
            amountSats: amountSats,
            blockNumber: tx.status?.block_height || null,
            decimals: 8,
            from: fromAddress,
            hash: tx.txid,
            logoURI: "https://cryptologos.cc/logos/bitcoin-btc-logo.png",
            networkFee: (tx.fee || 0) / 1e8,
            networkFeePayer: fromAddress,
            networkFeeSats: tx.fee || 0,
            status: tx.status?.confirmed ? "confirmed" : "pending",
            symbol: "BTC",
            to: toAddresses,
            tokenType: "coin",
        };
    });
}

// Build a standardized balance response
const buildBalanceResponse = (address, formatBTC, price, transactions) => ({
    address,
    balance: formatBTC.toString(),
    fiatBalance: formatBTC * price,
    fullName: "BTC",
    account: {
        asset: "BTC",
        fiatBalance: (formatBTC * price).toString(),
        price,
    },
    tokenHoldings: {
        balance: formatBTC,
        total: formatBTC,
        tokens: [
            {
                address,
                amount: formatBTC.toString(),
                decimals: 8,
                fiatBalance: formatBTC * price,
                image: "https://static.okx.com/cdn/wallet/logo/BTC.png",
                name: "Bitcoin",
                network: "Bitcoin",
                price,
                symbol: "BTC",
                tokenType: "BTC",
            },
        ],
    },
    transactions,
});

// Get transactions from mempool.space (primary)
const getTransactionsListFromMempool = async (params) => {
    const txsData = await makeApiRequest(`${MEMPOOL_BASE}/address/${params.id}/txs`);
    if (!txsData || txsData.length === 0) return { transactions: [] };
    return { transactions: extractTransactionDataFromBlockstream(txsData) };
};

// Get transactions from Blockstream (fallback)
const getTransactionsListFromBlockstream = async (params) => {
    const txsData = await makeApiRequest(`${BLOCKSTREAM_BASE}/address/${params.id}/txs`);
    if (!txsData || txsData.length === 0) return { transactions: [] };
    return { transactions: extractTransactionDataFromBlockstream(txsData) };
};

// Obtener lista de transacciones
const getTransactionsList = async (params, query = { show: "25" }) => {
    try {
        return await getTransactionsListFromMempool(params);
    } catch (_primaryErr) {
        try {
            return await getTransactionsListFromBlockstream(params);
        } catch (fallbackErr) {
            console.error("All transaction sources failed:", fallbackErr?.message || fallbackErr);
            return { transactions: [] };
        }
    }
};

// Obtener detalles de una transacción específica
const getTransactionDetail = async (params) => {
    try {
        const data = await makeApiRequest(`${MEMPOOL_BASE}/tx/${params.id}`);
        return extractTransactionDataFromBlockstream([data]);
    } catch (_primaryErr) {
        try {
            const data = await makeApiRequest(`${BLOCKSTREAM_BASE}/tx/${params.id}`);
            return extractTransactionDataFromBlockstream([data]);
        } catch (fallbackErr) {
            console.error("Transaction detail fetch failed:", fallbackErr?.message || fallbackErr);
            throw fallbackErr;
        }
    }
};

// Get balance from mempool.space (primary)
const getBalanceFromMempool = async (params) => {
    const data = await makeApiRequest(`${MEMPOOL_BASE}/address/${params.id}`);
    const { price } = await getTickerPrice({ symbol: "BTC" });
    const balanceSatoshi = (data.chain_stats?.funded_txo_sum || 0) - (data.chain_stats?.spent_txo_sum || 0);
    const formatBTC = convertSatoshiToBTC(balanceSatoshi);
    const { transactions } = await getTransactionsListFromMempool({ id: params.id });
    return buildBalanceResponse(params.id, formatBTC, price, transactions);
};

// Get balance from Blockstream (fallback)
const getBalanceFromBlockstream = async (params) => {
    const data = await makeApiRequest(`${BLOCKSTREAM_BASE}/address/${params.id}`);
    const { price } = await getTickerPrice({ symbol: "BTC" });
    const balanceSatoshi = (data.chain_stats?.funded_txo_sum || 0) - (data.chain_stats?.spent_txo_sum || 0);
    const formatBTC = convertSatoshiToBTC(balanceSatoshi);
    const { transactions } = await getTransactionsListFromBlockstream({ id: params.id });
    return buildBalanceResponse(params.id, formatBTC, price, transactions);
};

// Obtener balance de una dirección
const getBalance = async (params) => {
    try {
        return await getBalanceFromMempool(params);
    } catch (primaryErr) {
        const isTimeout =
            primaryErr?.code === "ECONNABORTED" || /timeout/i.test(String(primaryErr?.message || ""));
        const is429 = primaryErr?.response?.status === 429;
        if (!isTimeout && !is429) console.error("mempool.space balance error:", primaryErr?.message || primaryErr);

        try {
            return await getBalanceFromBlockstream(params);
        } catch (fallbackError) {
            console.error("All Bitcoin API sources failed:", fallbackError?.message || fallbackError);
            const error = new Error("not_found");
            error.status = 404;
            throw error;
        }
    }
};

module.exports = {
    getBalance,
    getTransactionsList,
    getTransactionDetail,
};
