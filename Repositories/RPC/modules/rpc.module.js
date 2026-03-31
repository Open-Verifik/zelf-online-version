const config = require("../../../Core/config");
const { getCleanInstance } = require("../../../Core/axios");
const RpcLog = require("../models/rpc-log.model");
const RpcCallerModule = require("../../RPCCaller/modules/rpc-caller.module");

const instance = getCleanInstance(config.rpc?.timeoutMs || 15000);

const truncateMessage = (message, maxLen = 500) => {
    if (message == null || message === "") {
        return null;
    }
    const s = String(message);
    return s.length > maxLen ? s.slice(0, maxLen) : s;
};

const persistRpcAudit = (payload) => {
    void RpcLog.create(payload).catch((err) => {
        console.error("[RPC proxy] audit log failed", err?.message || err);
    });
};

const chainEntries = Object.entries(config.rpc?.chains || {});
const chainsByKey = new Map(
    chainEntries.map(([key, value]) => [
        key.toLowerCase(),
        {
            key,
            chainId: Number(value.chainId),
            rpcUrl: value.rpcUrl,
        },
    ])
);
const chainsById = new Map(chainEntries.map(([key, value]) => [Number(value.chainId), chainsByKey.get(key.toLowerCase())]));
const allowedMethods = new Set((config.rpc?.allowedMethods || []).map((method) => String(method).toLowerCase()));
const blockedMethods = new Set((config.rpc?.blockedMethods || []).map((method) => String(method).toLowerCase()));
const blockedPrefixes = (config.rpc?.blockedMethodPrefixes || []).map((prefix) => String(prefix).toLowerCase());

const getChains = () =>
    Array.from(chainsByKey.values()).map((chain) => ({
        chain: chain.key,
        chainId: chain.chainId,
        rpcConfigured: Boolean(chain.rpcUrl),
    }));

const resolveChain = ({ chain, chainId }) => {
    if (chain) {
        return chainsByKey.get(String(chain).trim().toLowerCase()) || null;
    }

    if (chainId !== undefined && chainId !== null && chainId !== "") {
        return chainsById.get(Number(chainId)) || null;
    }

    return null;
};

const ensureMethodAllowed = (method) => {
    const normalized = String(method || "").trim().toLowerCase();

    if (!normalized) {
        const error = new Error("Missing RPC method");
        error.status = 400;
        throw error;
    }

    const isBlocked = blockedMethods.has(normalized) || blockedPrefixes.some((prefix) => normalized.startsWith(prefix));
    if (isBlocked) {
        const error = new Error(`RPC method ${normalized} is blocked`);
        error.status = 403;
        throw error;
    }

    if (allowedMethods.size && !allowedMethods.has(normalized)) {
        const error = new Error(`RPC method ${normalized} is not allowlisted`);
        error.status = 403;
        throw error;
    }

    return normalized;
};

/**
 * JSON-RPC method names are case-sensitive on many nodes (e.g. eth_chainId vs eth_chainid).
 * We keep lowercase for policy checks; for upstream calls we use the canonical string from
 * config allowlist when present, otherwise the client-provided casing.
 */
const resolveUpstreamMethodName = (normalized, originalMethod) => {
    const list = config.rpc?.allowedMethods || [];
    if (list.length) {
        const fromConfig = list.find((m) => String(m).toLowerCase() === normalized);
        if (fromConfig) {
            return String(fromConfig);
        }
    }
    const raw = String(originalMethod ?? "").trim();
    if (raw && raw.toLowerCase() === normalized) {
        return raw;
    }
    return normalized;
};

const forwardRequest = async ({ chain, chainId, method, params = [], origin, purpose, rpcId }, meta = {}) => {
    const resolvedChain = resolveChain({ chain, chainId });

    if (!resolvedChain?.rpcUrl) {
        const error = new Error("Unsupported RPC chain");
        error.status = 400;
        throw error;
    }

    const normalizedMethod = ensureMethodAllowed(method);
    const upstreamMethod = resolveUpstreamMethodName(normalizedMethod, method);

    const normalizedParams = Array.isArray(params) ? params : [];

    if (normalizedParams.length > (config.rpc?.maxParamsLength || 25)) {
        const error = new Error("Too many RPC params");
        error.status = 400;
        throw error;
    }

    const logContext = {
        chain: resolvedChain.key,
        chainId: resolvedChain.chainId,
        method: normalizedMethod,
        origin: origin || "wallet",
        purpose: purpose || "unspecified",
        session: meta?.authUser?.session || null,
        ip: meta?.ip || null,
    };

    await RpcCallerModule.assertNotBanned(meta?.ip);
    await RpcCallerModule.assertWithinRateLimit(meta?.ip);
    RpcCallerModule.recordRequest(meta?.ip);

    if (process.env.NODE_ENV !== "production") {
        console.info("[RPC proxy request]", logContext);
    }

    try {
        const { data } = await instance.post(
            resolvedChain.rpcUrl,
            {
                jsonrpc: "2.0",
                id: rpcId ?? 1,
                method: upstreamMethod,
                params: normalizedParams,
            },
            {
                headers: { "Content-Type": "application/json" },
            }
        );

        if (data?.error) {
            const error = new Error(data.error.message || "RPC upstream error");
            error.status = 502;
            error.details = data.error;
            throw error;
        }

        persistRpcAudit({
            ...logContext,
            success: true,
            httpStatus: 200,
        });

        return {
            chain: resolvedChain.key,
            chainId: resolvedChain.chainId,
            method: upstreamMethod,
            result: data?.result ?? null,
            upstreamId: data?.id ?? rpcId ?? 1,
        };
    } catch (error) {
        const status = error.status || 502;
        persistRpcAudit({
            ...logContext,
            success: false,
            httpStatus: status,
            errorMessage: truncateMessage(error?.message),
        });

        if (error.status) {
            throw error;
        }

        const upstreamError = new Error(error?.message || "RPC upstream request failed");
        upstreamError.status = 502;
        throw upstreamError;
    }
};

module.exports = {
    forwardRequest,
    getChains,
};
