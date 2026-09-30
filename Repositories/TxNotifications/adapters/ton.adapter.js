const { Address } = require("@ton/core");

const config = require("../../../Core/config");
const { formatUnits } = require("../modules/amount.util");
const { ProviderError, getJson } = require("./http.util");

/**
 * TON via TonAPI account events (the same source and the same `event_id` hash
 * the backend history endpoint gives the apps). Addresses are compared in raw
 * form (`0:<hex>`), so EQ…, UQ… and raw spellings match the same account.
 * Jettons are announced only when TonAPI verification is `whitelist`, and
 * events TonAPI flags as scam are ignored.
 */

const baseUrl = () => (config.ton?.indexerUrl || "https://tonapi.io").replace(/\/$/, "");

const toRaw = (address) => {
    try {
        return Address.parse(String(address)).toRawString().toLowerCase();
    } catch (_) {
        return null;
    }
};

/** Wallets are shown non-bounceable (UQ…), contracts bounceable (EQ…), as TON wallets do. */
const friendly = (account) => {
    try {
        return Address.parse(account.address).toString({ bounceable: !account.is_wallet, urlSafe: true, testOnly: false });
    } catch (_) {
        return account?.address || null;
    }
};

/** TonAPI event → incoming transfer for the raw account `ownerRaw`, or null. */
const parseTonEvent = (event, ownerRaw) => {
    if (!event?.event_id || event.in_progress || event.is_scam) return null;
    const timestampMs = Number(event.timestamp) * 1000;
    if (!Number.isFinite(timestampMs) || timestampMs <= 0) return null;

    for (const action of event.actions || []) {
        if (action?.status !== "ok") continue;

        if (action.type === "TonTransfer") {
            const transfer = action.TonTransfer;
            if (toRaw(transfer?.recipient?.address) !== ownerRaw) continue;
            if (!transfer?.sender || toRaw(transfer.sender.address) === ownerRaw) continue;
            return {
                network: "ton",
                hash: event.event_id,
                amount: formatUnits(String(transfer.amount), 9),
                asset: "TON",
                from: friendly(transfer.sender),
                timestampMs,
                native: true,
            };
        }

        if (action.type === "JettonTransfer") {
            const transfer = action.JettonTransfer;
            if (toRaw(transfer?.recipient?.address) !== ownerRaw) continue;
            if (transfer?.sender && toRaw(transfer.sender.address) === ownerRaw) continue;
            const jetton = transfer?.jetton;
            if (!jetton || jetton.verification !== "whitelist" || !jetton.symbol) continue;
            return {
                network: "ton",
                hash: event.event_id,
                amount: formatUnits(String(transfer.amount), Number(jetton.decimals ?? 9)),
                asset: jetton.symbol,
                from: transfer.sender ? friendly(transfer.sender) : null,
                timestampMs,
                native: false,
            };
        }
    }

    return null;
};

const fetchEvents = async (raw, params) => {
    const url = `${baseUrl()}/v2/accounts/${encodeURIComponent(raw)}/events`;
    const apiKey = config.ton?.apiKey;
    if (apiKey) {
        try {
            return await getJson(url, { params, headers: { Authorization: `Bearer ${apiKey}` }, label: "tonapi" });
        } catch (error) {
            // TON_API_KEY may be a toncenter key; TonAPI then refuses it but answers anonymously.
            if (!(error instanceof ProviderError) || (error.status !== 401 && error.status !== 403)) throw error;
        }
    }
    return getJson(url, { params, label: "tonapi" });
};

const poll = async ({ address, state = {}, seen, minTimestampMs }) => {
    const raw = toRaw(address);
    if (!raw) throw new ProviderError("ton_bad_address", { retryable: false });

    const page = await fetchEvents(raw, { limit: state.seededAt ? 25 : 10 });
    const observed = [];
    const transfers = [];

    for (const event of page?.events || []) {
        if (!event?.event_id || event.in_progress) continue;
        observed.push(event.event_id);
        if (seen.has(event.event_id) || Number(event.timestamp) * 1000 < minTimestampMs) continue;
        const transfer = parseTonEvent(event, raw);
        if (transfer) transfers.push(transfer);
    }

    return { state: { seededAt: state.seededAt || Date.now() }, transfers, observed };
};

module.exports = {
    network: "ton",
    parseTonEvent,
    poll,
    toRaw,
};
