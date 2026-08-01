const { AccountAddress, Aptos, AptosConfig, Network } = require("@aptos-labs/ts-sdk");
const config = require("../../../Core/config");

const NETWORKS = {
    mainnet: Network.MAINNET,
    testnet: Network.TESTNET,
    devnet: Network.DEVNET,
    local: Network.LOCAL,
};

let cachedClient;
let cachedFingerprint;

const getNetwork = () => {
    const configured = String(config.aptos?.network || "mainnet").toLowerCase();
    const network = NETWORKS[configured];

    if (!network) {
        const error = new Error(`aptos_network_not_supported:${configured}`);
        error.status = 500;
        throw error;
    }

    return network;
};

const getAptosClient = () => {
    const network = getNetwork();
    const fullnode = String(config.aptos?.fullnodeUrl || "").trim() || undefined;
    const indexer = String(config.aptos?.indexerUrl || "").trim() || undefined;
    const apiKey = String(config.aptos?.apiKey || "").trim() || undefined;
    const fingerprint = JSON.stringify({ network, fullnode, indexer, apiKey });

    if (cachedClient && cachedFingerprint === fingerprint) return cachedClient;

    const clientConfig = { http2: false };
    if (apiKey) clientConfig.API_KEY = apiKey;

    cachedClient = new Aptos(
        new AptosConfig({
            network,
            fullnode,
            indexer,
            clientConfig,
            transactionGenerationConfig: {
                defaultMaxGasAmount: Number(config.aptos?.maxGasAmount) || 200000,
            },
        })
    );
    cachedFingerprint = fingerprint;

    return cachedClient;
};

const normalizeAptosAddress = (value) => {
    try {
        return AccountAddress.fromString(String(value || "").trim()).toStringLong();
    } catch (_error) {
        const error = new Error("aptos_address_invalid");
        error.status = 400;
        throw error;
    }
};

const normalizeTransactionHash = (value) => {
    const hash = String(value || "")
        .trim()
        .toLowerCase();
    if (!/^0x[a-f0-9]{64}$/.test(hash)) {
        const error = new Error("aptos_transaction_hash_invalid");
        error.status = 400;
        throw error;
    }
    return hash;
};

const withAptosTimeout = async (promise, operation = "request") => {
    const timeoutMs = Number(config.aptos?.timeoutMs) || 30000;
    let timer;

    try {
        return await Promise.race([
            promise,
            new Promise((_, reject) => {
                timer = setTimeout(() => {
                    const error = new Error(`aptos_${operation}_timeout`);
                    error.status = 504;
                    reject(error);
                }, timeoutMs);
            }),
        ]);
    } finally {
        if (timer) clearTimeout(timer);
    }
};

const toAptosUpstreamError = (exception, fallback = "aptos_upstream_error") => {
    if (exception?.status && exception.status >= 400 && exception.status < 500) {
        const error = new Error(exception.status === 404 ? "aptos_resource_not_found" : fallback);
        error.status = exception.status === 429 ? 503 : exception.status;
        return error;
    }

    const error = new Error(fallback);
    error.status = exception?.status === 504 ? 504 : 502;
    return error;
};

module.exports = {
    getAptosClient,
    getNetwork,
    normalizeAptosAddress,
    normalizeTransactionHash,
    toAptosUpstreamError,
    withAptosTimeout,
};
