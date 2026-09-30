const config = require("../../../Core/config");
const { formatUnits } = require("../modules/amount.util");
const { getJson } = require("./http.util");

/**
 * Bitcoin via Esplora (mempool.space, then blockstream.info). Only confirmed
 * transactions count: a mempool transaction can still be replaced (RBF), and a
 * "you received" push for coins that never arrive is worse than a late one.
 * Unconfirmed transactions are not marked seen, so they are pushed once mined.
 */

const esploraUrls = () => config.txNotifications?.bitcoinEsploraUrls || ["https://mempool.space/api", "https://blockstream.info/api"];

/** Incoming value for `address`, or null for own sends (we fund an input) and no-output transactions. */
const parseBitcoinTransaction = (tx, address) => {
    if (!tx?.txid || !tx.status?.confirmed || !tx.status.block_time) return null;

    const inputs = tx.vin || [];
    if (inputs.some((input) => input?.prevout?.scriptpubkey_address === address)) return null;

    let sats = 0n;
    for (const output of tx.vout || []) {
        if (output?.scriptpubkey_address === address) sats += BigInt(output.value || 0);
    }
    if (sats <= 0n) return null;

    const sender = inputs.find((input) => input?.prevout?.scriptpubkey_address)?.prevout?.scriptpubkey_address || null;

    return {
        network: "bitcoin",
        hash: tx.txid,
        amount: formatUnits(sats, 8),
        asset: "BTC",
        from: sender,
        timestampMs: tx.status.block_time * 1000,
        native: true,
    };
};

const fetchAddressTransactions = async (address) => {
    let lastError;
    for (const base of esploraUrls()) {
        try {
            return await getJson(`${base.replace(/\/$/, "")}/address/${encodeURIComponent(address)}/txs`, { label: "esplora" });
        } catch (error) {
            lastError = error;
        }
    }
    throw lastError;
};

const poll = async ({ address, state = {}, seen, minTimestampMs }) => {
    const list = (await fetchAddressTransactions(address)) || [];
    const observed = [];
    const transfers = [];

    for (const tx of list) {
        if (!tx?.status?.confirmed) continue;
        observed.push(tx.txid);
        if (seen.has(tx.txid) || tx.status.block_time * 1000 < minTimestampMs) continue;
        const transfer = parseBitcoinTransaction(tx, address);
        if (transfer) transfers.push(transfer);
    }

    return { state, transfers, observed };
};

module.exports = {
    network: "bitcoin",
    parseBitcoinTransaction,
    poll,
};
