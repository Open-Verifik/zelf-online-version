const etherscanModule = require("../../etherscan/modules/etherscan.module");
const bitcoinScrapingModule = require("../../bitcoin/modules/bitcoin-scrapping.module");
const solanaScrapingModule = require("../../Solana/modules/solana-scrapping.module");
const avalancheScrapingModule = require("../../Avalanche/modules/avalanche-scrapping.module");
const blockdagModule = require("../../BlockDAG/modules/blockdag.module");

const EVM_ADDRESS_RE = /^0x[a-fA-F0-9]{40}$/;

const isEvmAddress = (a) => typeof a === "string" && EVM_ADDRESS_RE.test(a.trim());

/**
 * @param {string|number|null} value
 * @param {string} unit
 * @param {unknown} [raw]
 * @param {string} [error]
 */
const chainSlot = (value, unit, raw, error) => {
    const slot = { unit };
    if (error) {
        slot.value = null;
        slot.error = error;
    } else {
        slot.value = value;
        if (raw !== undefined) slot.raw = raw;
    }
    return slot;
};

const parseWeiToEthString = (wei) => {
    if (wei === undefined || wei === null) return null;
    const s = String(wei).trim();
    if (!/^\d+$/.test(s)) return null;
    const bn = BigInt(s);
    const whole = bn / 10n ** 18n;
    const frac = bn % 10n ** 18n;
    const fracStr = frac.toString().padStart(18, "0").replace(/0+$/, "");
    if (fracStr.length === 0) return whole.toString();
    return `${whole.toString()}.${fracStr}`;
};

/**
 * Native balances for tag public addresses (ETH / BTC / SOL / AVAX C-chain / BDAG).
 * AVAX and BDAG use the same 0x address as ETH when present.
 *
 * @param {{ ethAddress?: string, btcAddress?: string, solanaAddress?: string }} params
 * @returns {Promise<{ eth: object, btc: object, sol: object, avax: object, bdag: object }>}
 */
const getTagWalletBalances = async (params) => {
    const eth = params.ethAddress?.trim() || "";
    const btc = params.btcAddress?.trim() || "";
    const sol = params.solanaAddress?.trim() || "";

    const evm = isEvmAddress(eth) ? eth : "";

    const settled = await Promise.allSettled([
        evm
            ? etherscanModule.getBalance({ address: evm })
            : Promise.resolve(null),
        btc ? bitcoinScrapingModule.getBalance({ id: btc }) : Promise.resolve(null),
        sol ? solanaScrapingModule.getAddress({ id: sol }) : Promise.resolve(null),
        evm ? avalancheScrapingModule.getBalance({ id: evm }) : Promise.resolve(null),
        evm ? blockdagModule.fetchBdagBalance(evm) : Promise.resolve(null),
    ]);

    let ethSlot = chainSlot(null, "ETH");
    if (!evm) {
        ethSlot = eth ? chainSlot(null, "ETH", undefined, "invalid_evm_address") : chainSlot(null, "ETH");
    } else if (settled[0].status === "fulfilled" && settled[0].value) {
        const wei = settled[0].value.balance;
        const ethStr = parseWeiToEthString(wei);
        if (ethStr === null) {
            ethSlot = chainSlot(null, "ETH", { balance: wei }, "balance_unavailable");
        } else {
            ethSlot = chainSlot(ethStr, "ETH", { wei: String(wei) });
        }
    } else {
        const err = settled[0].status === "rejected" ? settled[0].reason?.message || "unavailable" : "unavailable";
        ethSlot = chainSlot(null, "ETH", undefined, err);
    }

    let btcSlot = chainSlot(null, "BTC");
    if (!btc) {
        btcSlot = chainSlot(null, "BTC");
    } else if (settled[1].status === "fulfilled" && settled[1].value) {
        const b = settled[1].value.balance;
        btcSlot = chainSlot(b != null ? String(b) : null, "BTC", undefined, b == null ? "balance_unavailable" : undefined);
    } else {
        const err = settled[1].status === "rejected" ? settled[1].reason?.message || "unavailable" : "unavailable";
        btcSlot = chainSlot(null, "BTC", undefined, err);
    }

    let solSlot = chainSlot(null, "SOL");
    if (!sol) {
        solSlot = chainSlot(null, "SOL");
    } else if (settled[2].status === "fulfilled") {
        const res = settled[2].value;
        if (res && res.balance != null && res.balance !== "") {
            solSlot = chainSlot(String(res.balance), "SOL");
        } else {
            solSlot = chainSlot(null, "SOL", undefined, "unavailable");
        }
    } else {
        const err = settled[2].reason?.message || "unavailable";
        solSlot = chainSlot(null, "SOL", undefined, err);
    }

    let avaxSlot = chainSlot(null, "AVAX");
    if (!evm) {
        avaxSlot = chainSlot(null, "AVAX");
    } else if (settled[3].status === "fulfilled" && settled[3].value) {
        const b = settled[3].value.balance;
        avaxSlot = chainSlot(b != null ? String(b) : null, "AVAX", undefined, b == null ? "balance_unavailable" : undefined);
    } else {
        const err = settled[3].status === "rejected" ? settled[3].reason?.message || "unavailable" : "unavailable";
        avaxSlot = chainSlot(null, "AVAX", undefined, err);
    }

    let bdagSlot = chainSlot(null, "BDAG");
    if (!evm) {
        bdagSlot = chainSlot(null, "BDAG");
    } else if (settled[4].status === "fulfilled" && settled[4].value) {
        const b = settled[4].value.balance;
        bdagSlot = chainSlot(b != null ? String(b) : null, "BDAG", undefined, b == null ? "balance_unavailable" : undefined);
    } else {
        const err = settled[4].status === "rejected" ? settled[4].reason?.message || "unavailable" : "unavailable";
        bdagSlot = chainSlot(null, "BDAG", undefined, err);
    }

    return {
        eth: ethSlot,
        btc: btcSlot,
        sol: solSlot,
        avax: avaxSlot,
        bdag: bdagSlot,
    };
};

module.exports = {
    getTagWalletBalances,
};
