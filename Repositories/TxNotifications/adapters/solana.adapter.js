const config = require("../../../Core/config");
const { formatUnits } = require("../modules/amount.util");
const { solanaMint } = require("../modules/tokens");
const { jsonRpc, mapWithConcurrency } = require("./http.util");

/**
 * Solana via plain JSON-RPC (the OKLink-backed history module answers 403 in
 * production and its RPC fallback rows carry no direction or amount).
 *
 * An SPL transfer into an *existing* token account does not list the wallet,
 * so besides the wallet itself we follow its token accounts for curated mints.
 * Each account keeps its own newest signature as `until` cursor.
 */

const TOKEN_PROGRAMS = ["TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA", "TokenzQdBNbLqP5VEhdkAS6EPFLC1PHnBqCXEpPxuEb"];
const TOKEN_ACCOUNTS_REFRESH_MS = 30 * 60 * 1000;
const MAX_TOKEN_ACCOUNTS = 10;
const MAX_DETAIL_LOOKUPS = 15;

const rpcUrl = () => config.solana?.rpcUrl || "https://api.mainnet-beta.solana.com";
const rpc = (method, params) => jsonRpc(rpcUrl(), method, params, { label: "solana" });

// Mainnet now carries version-1 transactions: asking with maxSupportedTransactionVersion 0
// fails with -32015 and names the version to use. Start at 1 and step down for nodes
// that reject it as an invalid parameter.
let maxTransactionVersion = 1;

const getTransaction = async (signature, attempt = 0) => {
    const options = { encoding: "jsonParsed", maxSupportedTransactionVersion: maxTransactionVersion, commitment: "confirmed" };
    try {
        return await rpc("getTransaction", [signature, options]);
    } catch (error) {
        if (attempt >= 2) throw error;
        if (error.code === "solana_rpc_-32015") {
            const suggested = Number(/maxSupportedTransactionVersion\D+(\d+)/.exec(error.rpcMessage || "")?.[1]);
            if (Number.isInteger(suggested) && suggested > maxTransactionVersion) {
                maxTransactionVersion = suggested;
                return getTransaction(signature, attempt + 1);
            }
            return null; // a version this node cannot serve: skip the transaction
        }
        if (error.code === "solana_rpc_-32602" && maxTransactionVersion > 0) {
            maxTransactionVersion -= 1;
            return getTransaction(signature, attempt + 1);
        }
        throw error;
    }
};

const sumByMint = (balances, owner) => {
    const totals = new Map();
    for (const entry of balances || []) {
        if (entry?.owner !== owner) continue;
        const raw = BigInt(entry.uiTokenAmount?.amount || "0");
        const current = totals.get(entry.mint) || { raw: 0n, decimals: entry.uiTokenAmount?.decimals ?? 0 };
        current.raw += raw;
        totals.set(entry.mint, current);
    }
    return totals;
};

/** Owner whose balance of `mint` went down the most in this transaction (the payer), if any. */
const tokenSender = (meta, mint, owner) => {
    const deltas = new Map();
    for (const entry of meta.preTokenBalances || []) {
        if (entry.mint !== mint || !entry.owner || entry.owner === owner) continue;
        deltas.set(entry.owner, (deltas.get(entry.owner) || 0n) - BigInt(entry.uiTokenAmount?.amount || "0"));
    }
    for (const entry of meta.postTokenBalances || []) {
        if (entry.mint !== mint || !entry.owner || entry.owner === owner) continue;
        deltas.set(entry.owner, (deltas.get(entry.owner) || 0n) + BigInt(entry.uiTokenAmount?.amount || "0"));
    }
    let best = null;
    for (const [candidate, delta] of deltas) {
        if (delta < 0n && (!best || delta < best.delta)) best = { owner: candidate, delta };
    }
    return best?.owner || null;
};

const accountKeyList = (transaction) =>
    (transaction?.message?.accountKeys || []).map((key) => (typeof key === "string" ? { pubkey: key, signer: false } : key));

/**
 * One confirmed transaction (jsonParsed) → incoming transfer for `owner`, or null.
 * Ignores transactions the owner signed (own sends, swaps) and uncurated SPL mints.
 */
const parseSolanaTransaction = (tx, owner) => {
    if (!tx?.meta || tx.meta.err) return null;

    const keys = accountKeyList(tx.transaction);
    if (keys.some((key) => key.pubkey === owner && key.signer)) return null;

    const hash = tx.transaction?.signatures?.[0];
    const timestampMs = tx.blockTime ? tx.blockTime * 1000 : null;
    if (!hash || !timestampMs) return null;

    const pre = sumByMint(tx.meta.preTokenBalances, owner);
    const post = sumByMint(tx.meta.postTokenBalances, owner);
    for (const [mint, after] of post) {
        const delta = after.raw - (pre.get(mint)?.raw || 0n);
        const token = solanaMint(mint);
        if (delta > 0n && token) {
            return {
                network: "solana",
                hash,
                amount: formatUnits(delta, after.decimals),
                asset: token.symbol,
                from: tokenSender(tx.meta, mint, owner) || keys[0]?.pubkey || null,
                timestampMs,
                native: false,
            };
        }
    }

    const index = keys.findIndex((key) => key.pubkey === owner);
    if (index < 0) return null;
    const lamports = BigInt(tx.meta.postBalances?.[index] ?? 0) - BigInt(tx.meta.preBalances?.[index] ?? 0);
    if (lamports <= 0n) return null;

    let sender = null;
    let largestDrop = 0n;
    keys.forEach((key, i) => {
        if (key.pubkey === owner) return;
        const drop = BigInt(tx.meta.preBalances?.[i] ?? 0) - BigInt(tx.meta.postBalances?.[i] ?? 0);
        if (drop > largestDrop) {
            largestDrop = drop;
            sender = key.pubkey;
        }
    });

    return {
        network: "solana",
        hash,
        amount: formatUnits(lamports, 9),
        asset: "SOL",
        from: sender || keys[0]?.pubkey || null,
        timestampMs,
        native: true,
    };
};

/** Token accounts (curated mints only) from getTokenAccountsByOwner jsonParsed results. */
const curatedTokenAccounts = (results) => {
    const accounts = [];
    for (const result of results) {
        for (const entry of result?.value || []) {
            const mint = entry?.account?.data?.parsed?.info?.mint;
            if (mint && solanaMint(mint)) accounts.push(entry.pubkey);
        }
    }
    return [...new Set(accounts)].slice(0, MAX_TOKEN_ACCOUNTS);
};

const fetchTokenAccounts = async (owner) => {
    const results = await Promise.all(
        TOKEN_PROGRAMS.map((programId) => rpc("getTokenAccountsByOwner", [owner, { programId }, { encoding: "jsonParsed", commitment: "confirmed" }]))
    );
    return curatedTokenAccounts(results);
};

const poll = async ({ address, state = {}, seen, minTimestampMs, now }) => {
    const seeding = !state.accounts;
    const nextState = {
        accounts: { ...(state.accounts || {}) },
        tokenAccounts: state.tokenAccounts || [],
        tokenAccountsAt: state.tokenAccountsAt || 0,
    };

    if (seeding || now - nextState.tokenAccountsAt > TOKEN_ACCOUNTS_REFRESH_MS) {
        nextState.tokenAccounts = await fetchTokenAccounts(address);
        nextState.tokenAccountsAt = now;
    }

    const watched = [address, ...nextState.tokenAccounts];
    const signatures = new Map();

    for (const account of watched) {
        const until = nextState.accounts[account];
        const options = { limit: until ? 25 : 10, commitment: "confirmed" };
        if (until) options.until = until;
        const list = (await rpc("getSignaturesForAddress", [account, options])) || [];
        if (list.length) nextState.accounts[account] = list[0].signature;
        else if (!(account in nextState.accounts)) nextState.accounts[account] = null;
        for (const item of list) signatures.set(item.signature, item);
    }

    // Accounts no longer followed (token account closed) drop out of the state.
    for (const account of Object.keys(nextState.accounts)) {
        if (!watched.includes(account)) delete nextState.accounts[account];
    }

    const observed = [];
    const candidates = [];
    for (const item of signatures.values()) {
        observed.push(item.signature);
        if (item.err || seen.has(item.signature)) continue;
        if (!item.blockTime || item.blockTime * 1000 < minTimestampMs) continue;
        candidates.push(item);
    }
    candidates.sort((a, b) => b.blockTime - a.blockTime);

    const details = await mapWithConcurrency(candidates.slice(0, MAX_DETAIL_LOOKUPS), 3, (item) => getTransaction(item.signature));

    const transfers = details.map((tx) => parseSolanaTransaction(tx, address)).filter(Boolean);

    return { state: nextState, transfers, observed };
};

module.exports = {
    TOKEN_PROGRAMS,
    curatedTokenAccounts,
    network: "solana",
    parseSolanaTransaction,
    poll,
};
