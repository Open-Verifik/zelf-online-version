const { getCleanInstance } = require("../../../Core/axios");
const { generateRandomUserAgent } = require("../../../Core/helpers");
const { getTickerPrice } = require("../../binance/modules/binance.module");
const moment = require("moment");
const instance = getCleanInstance(30000);
const SATOSHI_TO_BTC = 100000000;

const MEMPOOL_BASE = "https://mempool.space/api";
const MEMPOOL_TESTNET_BASE = "https://mempool.space/testnet/api";
const BLOCKSTREAM_BASE = "https://blockstream.info/api";
const BLOCKSTREAM_TESTNET_BASE = "https://blockstream.info/testnet/api";

const makeApiRequest = async (url) => {
    const { data } = await instance.get(url, {
        headers: {
            "user-agent": generateRandomUserAgent(),
        },
    });
    return data;
};

// Convertir valores de satoshis a BTC
const convertSatoshiToBTC = (satoshi) => satoshi / SATOSHI_TO_BTC;

// Convertir valores en transacciones a formato extendido
const convertTransactionValues = (transactions) => {
    if (!Array.isArray(transactions)) {
        transactions = [transactions];
    }

    return transactions.map((tx) => ({
        ...tx,
        date: tx.time,
        fee_btc: convertSatoshiToBTC(tx.fee),
        fee_satoshis: tx.fee,
        hash: tx.txid,
        network: "bitcoin",
        inputs: tx.inputs.map((input) => ({
            ...input,
            value_satoshis: input.value,
            value_btc: convertSatoshiToBTC(input.value),
        })),
        outputs: tx.outputs.map((output) => ({
            ...output,
            value_satoshis: output.value,
            value_btc: convertSatoshiToBTC(output.value),
        })),
    }));
};

// Get transactions from mempool.space (primary)
const getTransactionsListFromMempool = async (params) => {
    try {
        const txsData = await makeApiRequest(`${MEMPOOL_BASE}/address/${params.id}/txs`);
        if (!txsData || txsData.length === 0) return { transactions: [] };
        return { transactions: extractTransactionDataFromBlockstream(txsData) };
    } catch (error) {
        if (error?.response?.status !== 429) console.error("mempool.space transactions error:", error?.message || error);
        throw error;
    }
};

// Obtener lista de transacciones
const getTransactionsList = async (params, query = { show: "25" }) => {
    try {
        return await getTransactionsListFromMempool(params);
    } catch (_primaryErr) {
        try {
            return await getTransactionsListFromBlockstream(params, query);
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

// Detect if address is testnet
const isTestnetAddress = (address) => {
    return address && (address.startsWith("tb1") || address.startsWith("2M") || address.startsWith("n1") || address.startsWith("m1"));
};

// Build a standardized balance response from parsed values
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

// Get balance from mempool.space (primary)
const getBalanceFromMempool = async (params) => {
    const data = await makeApiRequest(`${MEMPOOL_BASE}/address/${params.id}`);
    const { price } = await getTickerPrice({ symbol: "BTC" });
    const balanceSatoshi = (data.chain_stats?.funded_txo_sum || 0) - (data.chain_stats?.spent_txo_sum || 0);
    const formatBTC = convertSatoshiToBTC(balanceSatoshi);
    const { transactions } = await getTransactionsListFromMempool({ id: params.id });
    return buildBalanceResponse(params.id, formatBTC, price, transactions);
};

// Obtener balance de una dirección
const getBalance = async (params) => {
    // Auto-detect testnet addresses and route to testnet handler
    if (isTestnetAddress(params.id)) {
        return await getTestnetBalance(params);
    }

    try {
        return await getBalanceFromMempool(params);
    } catch (primaryErr) {
        if (primaryErr?.response?.status !== 429) console.error("mempool.space balance error:", primaryErr?.message || primaryErr);

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

function extractTransactionData(transactions) {
    return transactions.map((tx) => {
        const fromInput = tx.inputs.find((input) => input.address);
        const toOutputs = tx.outputs.filter((output) => output.address && output.address !== fromInput?.address);

        const amountSats = toOutputs.reduce((sum, output) => sum + output.value, 0);
        const amountBTC = amountSats / 1e8;

        return {
            amount: amountBTC,
            amountSats: amountSats,
            blockNumber: tx.block?.height || null,
            decimals: 8,
            from: fromInput?.address || null,
            hash: tx.txid,
            logoURI: "https://cryptologos.cc/logos/bitcoin-btc-logo.png",
            networkFee: tx.fee / 1e8,
            networkFeePayer: fromInput?.address || null,
            networkFeeSats: tx.fee,
            status: tx.block ? "confirmed" : "pending",
            symbol: "BTC",
            to: toOutputs.map((output) => output.address),
            tokenType: "coin",
        };
    });
}

// Get transactions from Blockstream mainnet API (fallback)
const getTransactionsListFromBlockstream = async (params, query = { show: "25" }) => {
    try {
        const txsData = await makeApiRequest(`${BLOCKSTREAM_BASE}/address/${params.id}/txs`);
        if (!txsData || txsData.length === 0) return { transactions: [] };
        return { transactions: extractTransactionDataFromBlockstream(txsData) };
    } catch (error) {
        if (error?.response?.status !== 429) console.error("Blockstream transactions error:", error?.message || error);
        return { transactions: [] };
    }
};

// Extract transaction data from Blockstream API format
function extractTransactionDataFromBlockstream(transactions) {
    return transactions.map((tx) => {
        // Find the outputs that are the address we care about
        const relevantOutputs = tx.vout.filter((vout) => vout.scriptpubkey_address);

        const fromAddress = transactions[0]?.vin?.[0]?.prevout?.scriptpubkey_address || "";
        const toAddresses = relevantOutputs.map((vout) => vout.scriptpubkey_address).filter(Boolean);

        // Calculate amount in satoshis
        const amountSats = relevantOutputs.reduce((sum, vout) => sum + (vout.value || 0), 0);
        const amountBTC = amountSats / 1e8;

        return {
            amount: amountBTC,
            amountSats: amountSats,
            blockNumber: tx.status?.block_height || null,
            decimals: 8,
            from: fromAddress || "",
            hash: tx.txid,
            logoURI: "https://cryptologos.cc/logos/bitcoin-btc-logo.png",
            networkFee: (tx.fee || 0) / 1e8,
            networkFeePayer: fromAddress || "",
            networkFeeSats: tx.fee || 0,
            status: tx.status?.confirmed ? "confirmed" : "pending",
            symbol: "BTC",
            to: toAddresses,
            tokenType: "coin",
        };
    });
}

const getTestnetTransactionsList = async (params, query = { show: "25" }) => {
    try {
        const txsData = await makeApiRequest(`${MEMPOOL_TESTNET_BASE}/address/${params.id}/txs`);
        if (!txsData || txsData.length === 0) return { transactions: [] };
        return { transactions: extractTransactionDataFromBlockstream(txsData) };
    } catch (_primaryErr) {
        try {
            const txsData = await makeApiRequest(`${BLOCKSTREAM_TESTNET_BASE}/address/${params.id}/txs`);
            if (!txsData || txsData.length === 0) return { transactions: [] };
            return { transactions: extractTransactionDataFromBlockstream(txsData) };
        } catch (fallbackErr) {
            console.error("Testnet transactions fetch failed:", fallbackErr?.message || fallbackErr);
            return { transactions: [] };
        }
    }
};

// Get balance from Blockstream API (fallback)
const getBalanceFromBlockstream = async (params) => {
    const data = await makeApiRequest(`${BLOCKSTREAM_BASE}/address/${params.id}`);
    const { price } = await getTickerPrice({ symbol: "BTC" });
    const balanceSatoshi = (data.chain_stats?.funded_txo_sum || 0) - (data.chain_stats?.spent_txo_sum || 0);
    const formatBTC = convertSatoshiToBTC(balanceSatoshi);
    const { transactions } = await getTransactionsListFromBlockstream({ id: params.id });
    return buildBalanceResponse(params.id, formatBTC, price, transactions);
};

const getTestnetBalance = async (params) => {
    try {
        let data;
        try {
            data = await makeApiRequest(`${MEMPOOL_TESTNET_BASE}/address/${params.id}`);
        } catch (_primaryErr) {
            data = await makeApiRequest(`${BLOCKSTREAM_TESTNET_BASE}/address/${params.id}`);
        }

        const { price } = await getTickerPrice({ symbol: "BTC" });
        const balanceSatoshi = (data.chain_stats?.funded_txo_sum || 0) - (data.chain_stats?.spent_txo_sum || 0);
        const formatBTC = convertSatoshiToBTC(balanceSatoshi);

        const { transactions } = await getTestnetTransactionsList(params);

        return {
            address: params.id,
            balance: formatBTC.toString(),
            fiatBalance: formatBTC * price,
            fullName: "Testnet BTC",
            account: {
                asset: "tBTC",
                fiatBalance: (formatBTC * price).toString(),
                price: price,
            },
            tokenHoldings: {
                balance: formatBTC,
                total: formatBTC,
                tokens: [
                    {
                        address: params.id,
                        amount: formatBTC.toString(),
                        decimals: 8,
                        fiatBalance: (formatBTC * price).toString(),
                        image: "https://static.okx.com/cdn/wallet/logo/tbtc_21300.png",
                        name: "Testnet Bitcoin",
                        network: "Bitcoin",
                        price: price,
                        symbol: "BTC",
                        tokenType: "BTC",
                    },
                ],
            },
            transactions,
        };
    } catch (e) {
        const error = new Error("not_found");
        error.status = 404;
        throw error;
    }
};

function analizarTransaccion(tx, direccionPropia) {
    let totalEntrada = 0;
    let totalSalida = 0;
    let salidaPropia = 0;
    let entradaPropia = 0;

    // Entradas (inputs)
    tx.inputs.forEach((input) => {
        if (input.address === direccionPropia) {
            entradaPropia += input.value_satoshis;
        }
        totalEntrada += input.value_satoshis;
    });

    // Salidas (outputs)
    tx.outputs.forEach((output) => {
        // Algunos outputs como OP_RETURN no tienen dirección
        if (output.address === direccionPropia) {
            salidaPropia += output.value_satoshis;
        }
        totalSalida += output.value_satoshis;
    });

    const fueEnviada = entradaPropia > 0;
    const fueRecibida = salidaPropia > entradaPropia;

    const resultado = {
        direccion: direccionPropia,
        tipo: "",
        enviado: entradaPropia,
        recibido: salidaPropia,
        totalEntrada,
        totalSalida,
        fee: tx.fee_satoshis || totalEntrada - totalSalida,
    };

    if (fueEnviada && !fueRecibida) {
        resultado.tipo = "enviada";
    } else if (!fueEnviada && fueRecibida) {
        resultado.tipo = "recibida";
    } else if (fueEnviada && fueRecibida) {
        resultado.tipo = "mixta";
    } else {
        resultado.tipo = "irrelevante";
    }

    return resultado;
}

async function extractTransactionDataWithPrice(transactions, userAddress) {
    const { price: btcPrice } = await getTickerPrice({ symbol: "BTC" });

    if (!btcPrice) throw new Error("Could not retrieve BTC price");

    const formattedTransactions = transactions.map((tx) => {
        const fromInput = tx.inputs.find((input) => input.address);
        const toOutputs = tx.outputs.filter((output) => output.address && output.address !== fromInput?.address);

        const amountSats = toOutputs.reduce((sum, output) => sum + output.value, 0);
        const amountBTC = amountSats / 1e8;
        const fiatAmount = amountBTC * btcPrice;

        const txMoment = moment.unix(tx.time);
        const isOutgoing = tx.inputs.some((input) => input.address === userAddress);
        const isIncoming = tx.outputs.some((output) => output.address === userAddress);

        let traffic = "OUT";

        if (!isOutgoing && isIncoming) traffic = "IN";
        if (isOutgoing && isIncoming) traffic = "OUT";

        return {
            age: txMoment.fromNow(),
            amount: amountBTC.toString(),
            amountSats: amountSats,
            asset: "BTC",
            block: tx.block?.height?.toString() || "",
            date: txMoment.format("YYYY-MM-DD HH:mm:ss"),
            decimals: 8,
            fiatAmount: fiatAmount.toFixed(2),
            from: fromInput?.address || "",
            hash: tx.txid,
            logoURI: "https://cryptologos.cc/logos/bitcoin-btc-logo.png",
            networkFeePayer: fromInput?.address || "",
            status: tx.block.height ? "Success" : "Pending",
            to: toOutputs.map((output) => output.address),
            traffic,
            txnFee: (tx.fee / 1e8).toString(),
            txnFeeSats: tx.fee.toString(),
            timestamp: tx.time, // Keep original timestamp for sorting
        };
    });

    // Sort by timestamp (newest first)
    return formattedTransactions.sort((a, b) => b.timestamp - a.timestamp);
}

module.exports = {
    getBalance,
    getTestnetBalance,
    getTestnetTransactionsList,
    getTransactionsList,
    getTransactionDetail,
};
