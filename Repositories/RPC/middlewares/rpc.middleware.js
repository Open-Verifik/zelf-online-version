const { array, any, string, stringOrNumber, validate } = require("../../../Core/JoiUtils");
const config = require("../../../Core/config");

const RESERVED_CHAIN_PATH = new Set(["chains", "request"]);

const schemas = {
    request: {
        chain: string(),
        chainId: stringOrNumber(),
        method: string().required(),
        origin: string(),
        params: array(),
        purpose: string(),
        rpcId: stringOrNumber(),
    },
    /** Standard JSON-RPC 2.0 body (chain comes from URL path). */
    jsonRpc: {
        jsonrpc: string().valid("2.0").optional(),
        method: string().required(),
        params: array().optional().default([]),
        id: any().optional(),
    },
};

const ensureConfig = (ctx) => {
    if (!config.rpc?.chains || !Object.keys(config.rpc.chains).length) {
        ctx.status = 501;
        ctx.body = { error: "service_unavailable" };
        return false;
    }

    return true;
};

const requestValidation = async (ctx, next) => {
    if (!ensureConfig(ctx)) {
        return;
    }

    const valid = validate(schemas.request, ctx.request.body, ["chain", "chainId"]);
    if (valid.error) {
        ctx.status = 400;
        ctx.body = { validationError: valid.error.message };
        return;
    }

    ctx.request.body = valid.value;
    await next();
};

const jsonRpcValidation = async (ctx, next) => {
    if (!config.rpc?.chains || !Object.keys(config.rpc.chains).length) {
        ctx.status = 200;
        ctx.body = {
            jsonrpc: "2.0",
            id: ctx.request.body?.id ?? null,
            error: { code: -32603, message: "RPC service unavailable" },
        };
        return;
    }

    const { chainKey } = ctx.params;
    if (!chainKey || RESERVED_CHAIN_PATH.has(String(chainKey).toLowerCase())) {
        ctx.status = 404;
        ctx.body = { error: "not_found" };
        return;
    }

    const valid = validate(schemas.jsonRpc, ctx.request.body || {});
    if (valid.error) {
        ctx.status = 200;
        ctx.body = {
            jsonrpc: "2.0",
            id: ctx.request.body?.id ?? null,
            error: { code: -32600, message: valid.error.message.trim() },
        };
        return;
    }

    ctx.request.body = valid.value;
    await next();
};

module.exports = {
    requestValidation,
    jsonRpcValidation,
};
