const Module = require("../modules/rpc.module");

const jsonRpcErrorBody = (id, status, error) => {
    let code = -32603;
    let message = error?.message || "Internal error";
    let data = error?.details;

    if (status === 400) {
        code = -32602;
    } else if (status === 403) {
        code = -32601;
    } else if (status === 429) {
        code = -32005;
    } else if (status === 502) {
        code = -32603;
    }

    return {
        jsonrpc: "2.0",
        id: id !== undefined ? id : null,
        error: {
            code,
            message,
            ...(data != null ? { data } : {}),
        },
    };
};

const getChains = async (ctx) => {
    try {
        const data = Module.getChains();
        ctx.body = { data };
    } catch (error) {
        ctx.status = error.status || 500;
        ctx.body = { error: error.message };
    }
};

const request = async (ctx) => {
    try {
        const data = await Module.forwardRequest(ctx.request.body, {
            authUser: ctx.state.user,
            ip: ctx.ip,
        });

        ctx.body = { data };
    } catch (error) {
        ctx.status = error.status || 500;
        if (error.status === 429 && error.retryAfterSeconds != null) {
            ctx.set("Retry-After", String(error.retryAfterSeconds));
        }
        ctx.body = {
            error: error.message,
            ...(error.clientCode ? { clientCode: error.clientCode } : {}),
            ...(error.details ? { details: error.details } : {}),
        };
    }
};

/**
 * Drop-in JSON-RPC 2.0: POST /api/rpc/:chain with body
 * `{"jsonrpc":"2.0","id":1,"method":"eth_chainId","params":[]}` — chain is taken from the path only.
 */
const requestJsonRpc = async (ctx) => {
    const body = ctx.request.body;
    const chainKey = ctx.params.chainKey;
    const rpcId = body.id;

    try {
        const data = await Module.forwardRequest(
            {
                chain: chainKey,
                method: body.method,
                params: body.params ?? [],
                rpcId,
                origin: ctx.get("origin") || undefined,
                purpose: "json-rpc",
            },
            {
                authUser: ctx.state.user,
                ip: ctx.ip,
            }
        );

        ctx.status = 200;
        ctx.body = {
            jsonrpc: "2.0",
            id: rpcId !== undefined ? rpcId : null,
            result: data.result,
        };
    } catch (error) {
        const status = error.status || 500;
        if (status === 429 && error.retryAfterSeconds != null) {
            ctx.set("Retry-After", String(error.retryAfterSeconds));
        }
        ctx.status = 200;
        ctx.body = jsonRpcErrorBody(rpcId, status, error);
    }
};

module.exports = {
    getChains,
    request,
    requestJsonRpc,
};
