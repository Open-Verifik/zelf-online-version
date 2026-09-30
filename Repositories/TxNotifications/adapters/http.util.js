const axios = require("axios");

const config = require("../../../Core/config");

/**
 * Small HTTP layer for the watcher adapters. Errors become ProviderError with a
 * short code (never the URL, which may embed an API key, and never an address),
 * so the watcher can log them and back off.
 */
class ProviderError extends Error {
    constructor(code, { status = null, retryable = true } = {}) {
        super(code);
        this.name = "ProviderError";
        this.code = code;
        this.status = status;
        this.retryable = retryable;
    }
}

const timeout = () => config.txNotifications?.requestTimeoutMs || 20000;

const toProviderError = (error, label) => {
    if (error instanceof ProviderError) return error;
    const status = error?.response?.status || null;
    if (status) return new ProviderError(`${label}_http_${status}`, { status, retryable: status === 429 || status >= 500 });
    return new ProviderError(`${label}_${error?.code || "network_error"}`);
};

const getJson = async (url, { params, headers, label = "http" } = {}) => {
    try {
        const { data } = await axios.get(url, { params, headers, timeout: timeout() });
        return data;
    } catch (error) {
        throw toProviderError(error, label);
    }
};

const postJson = async (url, body, { headers, label = "http" } = {}) => {
    try {
        const { data } = await axios.post(url, body, {
            headers: { "Content-Type": "application/json", ...(headers || {}) },
            timeout: timeout(),
        });
        return data;
    } catch (error) {
        throw toProviderError(error, label);
    }
};

let rpcId = 0;

/** JSON-RPC 2.0 call; a JSON-RPC error becomes ProviderError(`<label>_rpc_<code>`). */
const jsonRpc = async (url, method, params = [], { headers, label = "rpc" } = {}) => {
    rpcId = (rpcId + 1) % 1e9;
    const data = await postJson(url, { jsonrpc: "2.0", id: rpcId, method, params }, { headers, label });
    if (data?.error) {
        const code = data.error.code ?? "error";
        const error = new ProviderError(`${label}_rpc_${code}`, { retryable: true });
        error.rpcMessage = String(data.error.message || "").slice(0, 160);
        throw error;
    }
    return data?.result;
};

/** Runs `worker` over `items` with at most `limit` in flight. */
const mapWithConcurrency = async (items, limit, worker) => {
    const results = new Array(items.length);
    let index = 0;
    const runners = Array.from({ length: Math.max(1, Math.min(limit, items.length)) }, async () => {
        while (index < items.length) {
            const current = index;
            index += 1;
            results[current] = await worker(items[current], current);
        }
    });
    await Promise.all(runners);
    return results;
};

module.exports = {
    ProviderError,
    getJson,
    jsonRpc,
    mapWithConcurrency,
    postJson,
    toProviderError,
};
