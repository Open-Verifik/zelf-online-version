const config = require("../../../Core/config");

let cachedSDKPromise;
let cachedFingerprint;
let walletSDKModulePromise;

const loadWalletSDK = () => {
    if (!walletSDKModulePromise) walletSDKModulePromise = import("@canton-network/wallet-sdk");
    return walletSDKModulePromise;
};

const configurationError = (message) => {
    const error = new Error(message);
    error.status = 503;
    return error;
};

const requireValue = (value, name) => {
    const normalized = String(value || "").trim();
    if (!normalized) throw configurationError(`canton_configuration_missing:${name}`);
    return normalized;
};

const parseUrl = (value, name, runtimeEnv = config.env) => {
    const raw = requireValue(value, name);
    let parsed;

    try {
        parsed = new URL(raw);
    } catch (_error) {
        throw configurationError(`canton_configuration_invalid_url:${name}`);
    }

    if (!["http:", "https:"].includes(parsed.protocol)) {
        throw configurationError(`canton_configuration_invalid_url:${name}`);
    }

    if (runtimeEnv === "production" && parsed.protocol !== "https:") {
        throw configurationError(`canton_configuration_requires_https:${name}`);
    }

    return parsed;
};

const buildTokenProviderConfig = (cantonConfig = config.canton, runtimeEnv = config.env) => {
    const method = String(cantonConfig.authMethod || "client_credentials").trim();

    if (method === "static") {
        return {
            method,
            token: requireValue(cantonConfig.staticToken, "CANTON_STATIC_TOKEN"),
        };
    }

    const credentials = {
        clientId: requireValue(cantonConfig.authClientId, "CANTON_AUTH_CLIENT_ID"),
        clientSecret: requireValue(cantonConfig.authClientSecret, "CANTON_AUTH_CLIENT_SECRET"),
        audience: String(cantonConfig.authAudience || "").trim() || undefined,
        scope: String(cantonConfig.authScope || "").trim() || undefined,
    };

    if (method === "self_signed") {
        if (runtimeEnv === "production") {
            throw configurationError("canton_self_signed_auth_not_allowed_in_production");
        }

        return {
            method,
            issuer: requireValue(cantonConfig.authIssuer, "CANTON_AUTH_ISSUER"),
            credentials,
        };
    }

    if (method === "client_credentials") {
        return {
            method,
            configUrl: parseUrl(cantonConfig.authConfigUrl, "CANTON_AUTH_CONFIG_URL", runtimeEnv).href,
            credentials,
        };
    }

    throw configurationError(`canton_auth_method_not_supported:${method}`);
};

const buildSDKOptions = (cantonConfig = config.canton, runtimeEnv = config.env) => {
    const auth = buildTokenProviderConfig(cantonConfig, runtimeEnv);
    const ledgerClientUrl = parseUrl(cantonConfig.ledgerApiUrl, "CANTON_LEDGER_API_URL", runtimeEnv);
    const registryUrl = parseUrl(cantonConfig.registryApiUrl, "CANTON_REGISTRY_API_URL", runtimeEnv);
    const validatorUrl = String(cantonConfig.validatorApiUrl || "").trim();

    return {
        auth,
        ledgerClientUrl,
        token: {
            auth,
            registries: [registryUrl],
            ...(validatorUrl
                ? { validatorUrl: parseUrl(validatorUrl, "CANTON_VALIDATOR_API_URL", runtimeEnv) }
                : {}),
        },
    };
};

const getConfigurationStatus = (cantonConfig = config.canton, runtimeEnv = config.env) => {
    const authMethod = String(cantonConfig.authMethod || "client_credentials").trim();
    const required = [
        ["CANTON_LEDGER_API_URL", cantonConfig.ledgerApiUrl],
        ["CANTON_REGISTRY_API_URL", cantonConfig.registryApiUrl],
    ];

    if (authMethod === "static") required.push(["CANTON_STATIC_TOKEN", cantonConfig.staticToken]);
    else {
        required.push(["CANTON_AUTH_CLIENT_ID", cantonConfig.authClientId]);
        required.push(["CANTON_AUTH_CLIENT_SECRET", cantonConfig.authClientSecret]);
        if (authMethod === "client_credentials") required.push(["CANTON_AUTH_CONFIG_URL", cantonConfig.authConfigUrl]);
        if (authMethod === "self_signed") required.push(["CANTON_AUTH_ISSUER", cantonConfig.authIssuer]);
    }

    const missing = required.filter(([, value]) => !String(value || "").trim()).map(([name]) => name);
    const allowUnboundDevelopment = runtimeEnv !== "production" && Boolean(cantonConfig.allowUnboundParties);
    const allowedPartyCount = Array.isArray(cantonConfig.allowedParties) ? cantonConfig.allowedParties.length : 0;
    const productionOwnershipMappingPending = runtimeEnv === "production";
    const authorizationConfigured =
        !productionOwnershipMappingPending && (allowUnboundDevelopment || allowedPartyCount > 0);
    const insecureProductionAuth = runtimeEnv === "production" && authMethod === "self_signed";

    return {
        network: cantonConfig.network || "devnet",
        authMethod,
        configured: {
            ledgerApi: Boolean(String(cantonConfig.ledgerApiUrl || "").trim()),
            validatorApi: Boolean(String(cantonConfig.validatorApiUrl || "").trim()),
            scanApi: Boolean(String(cantonConfig.scanApiUrl || "").trim()),
            tokenRegistry: Boolean(String(cantonConfig.registryApiUrl || "").trim()),
            authentication: missing.every((name) => !name.startsWith("CANTON_AUTH_") && name !== "CANTON_STATIC_TOKEN"),
        },
        authorization: {
            mode: productionOwnershipMappingPending
                ? "production-ownership-mapping-required"
                : allowUnboundDevelopment
                  ? "unbound-development"
                  : allowedPartyCount
                    ? "qa-allowlist"
                    : "unconfigured",
            allowedPartyCount,
        },
        signing: {
            mode: "external",
            backendAcceptsMnemonicOrPrivateKey: false,
        },
        missing,
        readyForReadAndPrepare: missing.length === 0 && authorizationConfigured && !insecureProductionAuth,
        requiresBackendDecision: [
            "validator/provider and target environment",
            "durable Zelf ID/session to Canton party ownership",
            "external-party onboarding and recovery",
            "transfer preapproval or command-delegation policy",
        ],
    };
};

const getCantonSDK = async () => {
    const options = buildSDKOptions();
    const fingerprint = JSON.stringify({
        network: config.canton.network,
        ledgerApiUrl: config.canton.ledgerApiUrl,
        registryApiUrl: config.canton.registryApiUrl,
        validatorApiUrl: config.canton.validatorApiUrl,
        authMethod: config.canton.authMethod,
        authConfigUrl: config.canton.authConfigUrl,
        authIssuer: config.canton.authIssuer,
        authClientId: config.canton.authClientId,
        authClientSecret: config.canton.authClientSecret,
        authAudience: config.canton.authAudience,
        authScope: config.canton.authScope,
        staticToken: config.canton.staticToken,
    });

    if (cachedSDKPromise && cachedFingerprint === fingerprint) return cachedSDKPromise;

    cachedFingerprint = fingerprint;
    cachedSDKPromise = loadWalletSDK()
        .then(({ SDK }) => SDK.create(options))
        .catch((error) => {
            cachedSDKPromise = undefined;
            cachedFingerprint = undefined;
            throw error;
        });

    return cachedSDKPromise;
};

const withCantonTimeout = async (promise, operation = "request") => {
    const timeoutMs = Number(config.canton?.timeoutMs) || 30000;
    let timer;

    try {
        return await Promise.race([
            promise,
            new Promise((_, reject) => {
                timer = setTimeout(() => {
                    const error = new Error(`canton_${operation}_timeout`);
                    error.status = 504;
                    reject(error);
                }, timeoutMs);
            }),
        ]);
    } finally {
        if (timer) clearTimeout(timer);
    }
};

const toCantonUpstreamError = (exception, fallback = "canton_upstream_error") => {
    const message = String(exception?.message || "");
    const isLocalCantonError = message.startsWith("canton_");

    if (isLocalCantonError && exception?.status >= 400 && exception.status < 600) return exception;
    if (exception?.status === 504 || message.includes("_timeout")) return exception;

    const upstreamStatus = Number(exception?.response?.status || exception?.statusCode || exception?.status || 0);
    const error = new Error(fallback);

    if (upstreamStatus === 404) error.status = 404;
    else if (upstreamStatus === 409) error.status = 409;
    else if ([401, 403, 429, 503].includes(upstreamStatus)) error.status = 503;
    else error.status = 502;

    return error;
};

module.exports = {
    buildSDKOptions,
    buildTokenProviderConfig,
    getCantonSDK,
    getConfigurationStatus,
    parseUrl,
    toCantonUpstreamError,
    withCantonTimeout,
};
