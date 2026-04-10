const { getCleanInstance } = require("../../../Core/axios");
const { generateRandomUserAgent } = require("../../../Core/helpers");
const { btcBookFallbackDefaultUrl } = require("../../../Core/twnodes-naas");
const { getTickerPrice } = require("../../binance/modules/binance.module");
const instance = getCleanInstance(30000);
const SATOSHI_TO_BTC = 100000000;

/** Blockbook v2 (twnodes) — full URL override via BTC_BOOK_FALLBACK_URL; else TWNODES_NAAS_SESSION_ID */
const btcBookBase = () => process.env.BTC_BOOK_FALLBACK_URL || btcBookFallbackDefaultUrl();

const makeApiRequest = async (url) => {
    const { data } = await instance.get(url, {
        headers: {
            "user-agent": generateRandomUserAgent(),
        },
    });
    return data;
};

const convertSatoshiToBTC = (satoshi) => satoshi / SATOSHI_TO_BTC;

// Blockbook / twnodes tx shape → standardized list item
function extractTransactionDataFromTwnodesSingle(tx) {
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

// Get transactions from Blockbook (twnodes) — address returns txids; fetch each tx
const getTransactionsListFromTwnodes = async (params, limit = 25) => {
    const base = btcBookBase();
    const summary = await makeApiRequest(`${base}/api/v2/address/${params.id}`);
    const txids = (summary.txids || []).slice(0, Math.min(100, Math.max(1, limit)));
    if (txids.length === 0) return { transactions: [] };

    const txs = await Promise.all(txids.map((txid) => makeApiRequest(`${base}/api/v2/tx/${txid}`).catch(() => null)));

    const transactions = txs.map((raw) => extractTransactionDataFromTwnodesSingle(raw)).filter(Boolean);

    return { transactions };
};

// Obtener lista de transacciones
const getTransactionsList = async (params, query = { show: "25" }) => {
    const limit = Math.min(100, Math.max(1, parseInt(String(query?.show), 10) || 25));
    try {
        return await getTransactionsListFromTwnodes(params, limit);
    } catch (err) {
        console.error("Bitcoin Blockbook transactions failed:", err?.message || err);
        return { transactions: [] };
    }
};

// Obtener detalles de una transacción específica
const getTransactionDetail = async (params) => {
    const base = btcBookBase();
    const data = await makeApiRequest(`${base}/api/v2/tx/${params.id}`);
    const one = extractTransactionDataFromTwnodesSingle(data);
    if (!one) throw new Error("invalid_twnodes_tx");
    return [one];
};

// Get balance from Blockbook (twnodes)
const getBalanceFromTwnodes = async (params) => {
    const base = btcBookBase();
    const data = await makeApiRequest(`${base}/api/v2/address/${params.id}`);
    const { price } = await getTickerPrice({ symbol: "BTC" });
    const balanceSatoshi = Number(data.balance || 0);
    const formatBTC = convertSatoshiToBTC(balanceSatoshi);
    const { transactions } = await getTransactionsListFromTwnodes(params, 25);
    return buildBalanceResponse(params.id, formatBTC, price, transactions);
};

// Obtener balance de una dirección
const getBalance = async (params) => {
    try {
        return await getBalanceFromTwnodes(params);
    } catch (err) {
        console.error("Bitcoin Blockbook balance error:", err?.message || err);
        const error = new Error("not_found");
        error.status = 404;
        throw error;
    }
};

module.exports = {
    getBalance,
    getTransactionsList,
    getTransactionDetail,
};
