const config = require("../../../Core/config");
const { getJson } = require("./http.util");

/**
 * BlockDAG via the bdagscan explorer API (`transaction/getTransactionByAddress`),
 * the same source Repositories/BlockDAG uses for history. `value` is already in
 * BDAG. Native transfers only; token and contract calls carry value 0.
 */

const apiUrl = () => config.txNotifications?.blockdagScanApiUrl || "https://api.bdagscan.com/v1/api";

/** bdagscan value ("20", "0.5", occasionally "1e-7") → plain decimal string, or null. */
const decimalValue = (value) => {
    const text = String(value ?? "").trim();
    if (/^\d+(\.\d+)?$/.test(text)) {
        const [whole, fraction = ""] = text.split(".");
        const trimmed = fraction.replace(/0+$/, "");
        return `${BigInt(whole).toString()}${trimmed ? `.${trimmed}` : ""}`;
    }
    const number = Number(text);
    if (!Number.isFinite(number) || number <= 0) return null;
    return number.toFixed(18).replace(/\.?0+$/, "");
};

/** bdagscan row → incoming native transfer for lowercase `address`, or null. */
const parseBlockdagTransaction = (row, address) => {
    if (!row?.txnHash || String(row.status).toLowerCase() !== "success") return null;
    if (String(row.to || "").toLowerCase() !== address) return null;
    if (String(row.from || "").toLowerCase() === address) return null;

    const amount = decimalValue(row.value);
    if (!amount || !/[1-9]/.test(amount)) return null;

    const timestampMs = Number(row.timestamp) * 1000;
    if (!Number.isFinite(timestampMs) || timestampMs <= 0) return null;

    return {
        network: "blockdag",
        hash: row.txnHash,
        amount,
        asset: "BDAG",
        from: row.from || null,
        timestampMs,
        native: true,
    };
};

const poll = async ({ address, state = {}, seen, minTimestampMs }) => {
    const owner = String(address).toLowerCase();
    const page = await getJson(`${apiUrl()}/transaction/getTransactionByAddress`, {
        params: { address: owner, limit: 25, page: 1, export: false },
        label: "bdagscan",
    });

    const observed = [];
    const transfers = [];
    for (const row of page?.data || []) {
        if (!row?.txnHash) continue;
        observed.push(row.txnHash);
        if (seen.has(row.txnHash)) continue;
        const transfer = parseBlockdagTransaction(row, owner);
        if (transfer && transfer.timestampMs >= minTimestampMs) transfers.push(transfer);
    }

    return { state, transfers, observed };
};

module.exports = {
    decimalValue,
    network: "blockdag",
    parseBlockdagTransaction,
    poll,
};
