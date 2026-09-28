const { getCleanInstance } = require("../../../Core/axios");
const { generateRandomUserAgent } = require("../../../Core/helpers");
const {
    getNaasNodeUrl,
    NAAS_CHAIN,
    refreshNaasCatalogAfterUnauthorized,
    isNaasNodeUnauthorizedError,
} = require("../../../Core/naas-gateway-catalog");
const { getTickerPrice } = require("../../binance/modules/binance.module");
const instance = getCleanInstance(8000);
const SATOSHI_TO_BTC = 100000000;

/** Blockbook path after base URL, e.g. `/api/v2/address/...` — retries once on NaaS 401 */
const requestBlockbook = async (pathAfterBase, { retried401 = false } = {}) => {
    const base = await getNaasNodeUrl(NAAS_CHAIN.BITCOIN);

    const url = `${base}${pathAfterBase.startsWith("/") ? "" : "/"}${pathAfterBase}`;
    try {
        const { data } = await instance.get(url, {
            headers: {
                "user-agent": generateRandomUserAgent(),
            },
        });
        return data;
    } catch (err) {
        if (!retried401 && isNaasNodeUnauthorizedError(err)) {
            await refreshNaasCatalogAfterUnauthorized();
            return requestBlockbook(pathAfterBase, { retried401: true });
        }
        throw err;
    }
};

const convertSatoshiToBTC = (satoshi) => satoshi / SATOSHI_TO_BTC;

// Blockbook tx shape → standardized list item
function extractTransactionDataFromSourceA(tx) {
    if (!tx?.txid) return null;

    const vouts = (tx.vout || []).filter((o) => Array.isArray(o.addresses) && o.addresses.length > 0);
    const toAddresses = vouts.flatMap((o) => o.addresses).filter(Boolean);
    const amountSats = vouts.reduce((sum, o) => sum + Number(o.value || 0), 0);
    const amountBTC = amountSats / 1e8;

    const vin0 = tx.vin?.[0];
    const fromAddress = vin0?.addresses?.[0] || "";
    const feeSats = Number(tx.fees || 0);
    const confirmed = Number(tx.confirmations) > 0 || (tx.blockHeight != null && Number(tx.blockHeight) > 0);

    return {
        amount: amountBTC,
        amountSats,
        blockNumber: tx.blockHeight ?? null,
        decimals: 8,
        from: fromAddress,
        hash: tx.txid,
        logoURI: "https://cryptologos.cc/logos/bitcoin-btc-logo.png",
        networkFee: feeSats / 1e8,
        networkFeePayer: fromAddress,
        networkFeeSats: feeSats,
        status: confirmed ? "confirmed" : "pending",
        symbol: "BTC",
        to: toAddresses,
        tokenType: "coin",
    };
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

// Get transactions from Blockbook — address returns txids; fetch each tx
const getTransactionsListFromSourceA = async (params, limit = 25) => {
    const summary = await requestBlockbook(`/api/v2/address/${params.id}`);
    const txids = (summary.txids || []).slice(0, Math.min(100, Math.max(1, limit)));
    if (txids.length === 0) return { transactions: [] };

    const txs = await Promise.all(txids.map((txid) => requestBlockbook(`/api/v2/tx/${txid}`).catch(() => null)));

    const transactions = txs.map((raw) => extractTransactionDataFromSourceA(raw)).filter(Boolean);

    return { transactions };
};

// Obtener lista de transacciones
const getTransactionsList = async (params, query = { show: "25" }) => {
    const limit = Math.min(100, Math.max(1, parseInt(String(query?.show), 10) || 25));
    try {
        return await getTransactionsListFromSourceA(params, limit);
    } catch (err) {
        console.error("Bitcoin Blockbook transactions failed:", err?.message || err);
        return { transactions: [] };
    }
};

// Obtener detalles de una transacción específica
const getTransactionDetail = async (params) => {
    const data = await requestBlockbook(`/api/v2/tx/${params.id}`);
    const one = extractTransactionDataFromSourceA(data);
    if (!one) throw new Error("invalid_book_tx");
    return [one];
};

// Get balance from Blockbook
const getBalanceFromSourceA = async (params) => {
    const data = await requestBlockbook(`/api/v2/address/${params.id}`);
    const { price } = await getTickerPrice({ symbol: "BTC" });
    const balanceSatoshi = Number(data.balance || 0);
    const formatBTC = convertSatoshiToBTC(balanceSatoshi);
    const { transactions } = await getTransactionsListFromSourceA(params, 25);
    return buildBalanceResponse(params.id, formatBTC, price, transactions);
};

// Independent Esplora fallback: a provider outage is never reported as a zero balance.
const getBalanceFromEsplora = async (params) => {
    for (const base of ["https://mempool.space/api", "https://blockstream.info/api"]) {
        try {
            const [summary, quote] = await Promise.all([
                instance.get(`${base}/address/${params.id}`), getTickerPrice({ symbol: "BTC" })
            ]);
            const stats = summary.data?.chain_stats;
            if (!stats || !Number.isSafeInteger(stats.funded_txo_sum) || !Number.isSafeInteger(stats.spent_txo_sum)) {
                throw new Error("invalid_bitcoin_balance");
            }
            const balance = (stats.funded_txo_sum - stats.spent_txo_sum) / SATOSHI_TO_BTC;
            let transactions = [], transactionsIncomplete = false;
            try {
                const { data } = await instance.get(`${base}/address/${params.id}/txs`);
                transactions = data.map((tx) => extractTransactionDataFromSourceA({
                    txid: tx.txid, fees: tx.fee, blockHeight: tx.status?.block_height,
                    confirmations: tx.status?.confirmed ? 1 : 0,
                    vin: tx.vin.map((input) => ({ addresses: [input.prevout?.scriptpubkey_address].filter(Boolean) })),
                    vout: tx.vout.map((output) => ({ addresses: [output.scriptpubkey_address].filter(Boolean), value: output.value })),
                })).filter(Boolean);
            } catch { transactionsIncomplete = true; }
            return { ...buildBalanceResponse(params.id, balance, quote.price, transactions), transactionsIncomplete };
        } catch { /* A second independent indexer may still answer. */ }
    }
    const error = new Error("bitcoin_balance_unavailable"); error.status = 502; throw error;
};

const getBalance = async (params) => {
    try { return await getBalanceFromSourceA(params); }
    catch { return getBalanceFromEsplora(params); }
};

module.exports = {
    getBalance,
    getTransactionsList,
    getTransactionDetail,
};
