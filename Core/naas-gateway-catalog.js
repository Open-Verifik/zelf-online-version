const axios = require("axios");

const { DEFAULT_GATEWAY_DEVICE_ID } = require("./models/naas-catalog-runtime-config.model");

const RUNTIME_CONFIG_KEY = "default";

function buildCatalogNodesUrlFromRuntime(runtime) {
    if (!runtime) {
        throw new Error("naas_catalog_runtime_config_not_found");
    }
    const base = String(runtime.catalogGatewayUrl || "").trim();
    const projectId = String(runtime.catalogProjectId || "").trim();
    const looksLikeFullNodesUrl = base.includes("/v2/projects/") && base.includes("/nodes");
    if (looksLikeFullNodesUrl) {
        return base;
    }
    if (base && projectId) {
        const normalizedBase = base.replace(/\/$/, "");
        return `${normalizedBase}/v2/projects/${projectId}/nodes`;
    }
    if (base) {
        return base;
    }
    if (projectId) {
        throw new Error("naas_catalog_runtime_config_missing_catalog_gateway_url");
    }
    throw new Error("naas_catalog_runtime_config_missing_catalog");
}

const DEFAULT_USER_AGENT = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/147.0.0.0 Safari/537.36";
const SESSION_SEGMENT_PREFIX = "/naas/session/";
const SESSION_IN_PATH_RE = /\/naas\/session\/([^/?#]+)/;
const CACHE_DOC_KEY = "default";

const NAAS_NODE_ORIGIN_BY_CHAIN = {
    bitcoin: "https://btc-book.twnodes.com",
    solana: "https://solana.twnodes.com",
    polygon: "https://polygon.twnodes.com",
    smartchain: "https://bsc.twnodes.com",
    ethereum: "https://ethereum.twnodes.com",
};

const NAAS_CHAIN = {
    BITCOIN: "bitcoin",
    SOLANA: "solana",
    POLYGON: "polygon",
    SMARTCHAIN: "smartchain",
    ETHEREUM: "ethereum",
};

let gatewayFetchMutex = null;

function catalogGatewayHeaders(dbGatewayDeviceId) {
    const fromDb = typeof dbGatewayDeviceId === "string" && dbGatewayDeviceId.trim() !== "" ? dbGatewayDeviceId.trim() : "";
    const deviceId = fromDb || String(DEFAULT_GATEWAY_DEVICE_ID || "").trim();
    if (!deviceId) {
        throw new Error("naas_catalog_runtime_config_missing_gateway_device_id");
    }
    return {
        "user-agent": DEFAULT_USER_AGENT.trim(),
        "x-tw-device-id": deviceId,
    };
}

function extractSessionToken(url) {
    if (!url || typeof url !== "string") return null;
    const m = url.match(SESSION_IN_PATH_RE);
    return m ? m[1] : null;
}

function buildUrlsByNameFromStoredToken(token) {
    const urlsByName = {};
    for (const [name, origin] of Object.entries(NAAS_NODE_ORIGIN_BY_CHAIN)) {
        urlsByName[name] = `${origin}${SESSION_SEGMENT_PREFIX}${token}`;
    }
    return urlsByName;
}

function getCacheModel() {
    return require("./models/naas-catalog-cache.model");
}

function getRuntimeConfigModel() {
    return require("./models/naas-catalog-runtime-config.model");
}

async function loadCatalogRuntimeConfigFromDb() {
    try {
        const NaasCatalogRuntimeConfig = getRuntimeConfigModel();
        const doc = await NaasCatalogRuntimeConfig.findOne({ key: RUNTIME_CONFIG_KEY })
            .select("catalogGatewayUrl catalogProjectId gatewayDeviceId")
            .lean();
        return doc;
    } catch (err) {
        console.error("[naas-catalog-runtime-config] db_read_failed", err?.message || err);
        return null;
    }
}

async function resolveCatalogGatewayUrl(preloadedRuntime) {
    const runtime = preloadedRuntime ?? (await loadCatalogRuntimeConfigFromDb());
    return buildCatalogNodesUrlFromRuntime(runtime);
}

async function loadSessionTokenFromDb() {
    try {
        const NaasCatalogCache = getCacheModel();
        const doc = await NaasCatalogCache.findOne({ key: CACHE_DOC_KEY }).select("sessionToken").lean();
        const t = doc?.sessionToken?.trim();
        if (!t) return null;
        return { sessionToken: t };
    } catch (err) {
        console.error("[naas-catalog-cache] db_read_failed", err?.message || err);
        return null;
    }
}

async function persistSessionTokenToDb(sessionToken) {
    const NaasCatalogCache = getCacheModel();
    await NaasCatalogCache.findOneAndUpdate(
        { key: CACHE_DOC_KEY },
        {
            $set: { sessionToken: sessionToken || "" },
            $unset: { urlsByName: "" },
        },
        { upsert: true }
    );
}

async function fetchGatewayCatalogPayload() {
    const runtime = await loadCatalogRuntimeConfigFromDb();
    const catalogUrl = await resolveCatalogGatewayUrl(runtime);
    const dbDeviceForHeader = runtime?.gatewayDeviceId;
    const { data } = await axios.get(catalogUrl, {
        headers: catalogGatewayHeaders(dbDeviceForHeader),
        timeout: 30000,
        validateStatus: (s) => s >= 200 && s < 500,
    });

    if (data?.code !== 2000 || !Array.isArray(data?.data)) {
        throw new Error("naas_catalog_invalid_response");
    }

    return data;
}

async function fetchSessionTokenFromGateway() {
    const data = await fetchGatewayCatalogPayload();
    const rows = data.data;
    const firstUrl = rows[0]?.nodes?.[0]?.url;
    const token = extractSessionToken(firstUrl);
    if (!token) {
        throw new Error("naas_catalog_no_session_token");
    }
    return token;
}

/** GET catalog API, persist new token (used when DB empty or after 401) */
async function fetchGatewayAndPersistToken() {
    if (gatewayFetchMutex) {
        await gatewayFetchMutex;
        return;
    }

    gatewayFetchMutex = (async () => {
        const token = await fetchSessionTokenFromGateway();
        await persistSessionTokenToDb(token);
    })();

    try {
        await gatewayFetchMutex;
    } finally {
        gatewayFetchMutex = null;
    }
}

async function resolveUrlsFromDatabase() {
    let dbDoc = await loadSessionTokenFromDb();
    let token = dbDoc?.sessionToken?.trim();

    if (!token) {
        await fetchGatewayAndPersistToken();
        dbDoc = await loadSessionTokenFromDb();
        token = dbDoc?.sessionToken?.trim();
    }

    if (!token) {
        throw new Error("naas_catalog_no_token_available");
    }

    return buildUrlsByNameFromStoredToken(token);
}

async function refreshNaasCatalogAfterUnauthorized() {
    await fetchGatewayAndPersistToken();
}

function isNaasNodeUnauthorizedError(err) {
    const status = err?.response?.status;
    return status === 401;
}

/** HTTP 500 from a NaaS node (e.g. session gateway overloaded). */
function isNaasNodeInternalServerError(err) {
    return err?.response?.status === 500;
}

const DEFAULT_NAAS_HTTP_500_RETRIES = 3;
const DEFAULT_NAAS_HTTP_500_DELAY_MS = 250;

/**
 * POST JSON-RPC to a NaaS URL; retries when the server responds with HTTP 500.
 * @param {import("axios").AxiosInstance} instance
 * @param {string} url
 * @param {object} payload
 * @param {{ maxAttempts?: number, delayMs?: number, onRetry?: (attempt: number, maxAttempts: number, url: string) => void }} [options]
 */
async function postNaasJsonRpcWith500Retries(instance, url, payload, options = {}) {
    const maxAttempts = Math.max(1, Number(options.maxAttempts ?? DEFAULT_NAAS_HTTP_500_RETRIES));
    const delayMs = Math.max(0, Number(options.delayMs ?? DEFAULT_NAAS_HTTP_500_DELAY_MS));
    const onRetry = options.onRetry;

    let lastErr;
    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
        try {
            const { data } = await instance.post(url, payload, {
                headers: { "Content-Type": "application/json" },
            });
            return data;
        } catch (err) {
            lastErr = err;
            const st = err?.response?.status;
            if (st === 500 && attempt < maxAttempts) {
                if (typeof onRetry === "function") {
                    onRetry(attempt, maxAttempts, url);
                }
                if (delayMs > 0) {
                    await new Promise((r) => setTimeout(r, delayMs));
                }
                continue;
            }
            throw err;
        }
    }
    throw lastErr;
}

function invalidateNaasCatalogCache() {}

/**
 * @param {string} catalogChainName — e.g. NAAS_CHAIN.BITCOIN
 * @returns {Promise<string>}
 */
async function getNaasNodeUrl(catalogChainName) {
    const urls = await resolveUrlsFromDatabase();
    const u = urls[catalogChainName];
    if (!u) {
        throw new Error(`naas_catalog_missing_chain:${catalogChainName}`);
    }
    return u;
}

module.exports = {
    NAAS_CHAIN,
    getNaasNodeUrl,
    invalidateNaasCatalogCache,
    refreshNaasCatalogAfterUnauthorized,
    isNaasNodeUnauthorizedError,
    isNaasNodeInternalServerError,
    postNaasJsonRpcWith500Retries,
};
