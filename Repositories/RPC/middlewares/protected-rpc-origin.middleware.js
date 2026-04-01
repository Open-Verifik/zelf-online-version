const config = require("../../../Core/config");

/**
 * When `config.extension.rpc.allowedRequestOrigins` is non-empty, only those
 * `Origin` header values may call GET/POST /api/protected/rpc/* (e.g. chrome-extension://<id>).
 * Empty allowlist = no check (backward compatible).
 */
const requireAllowedProtectedRpcOrigin = async (ctx, next) => {
    const allowed = config.extension?.rpc?.allowedRequestOrigins;
    if (!Array.isArray(allowed) || allowed.length === 0) {
        await next();
        return;
    }

    const origin = String(ctx.get("origin") || ctx.headers.origin || "").trim();
    if (!origin || !allowed.includes(origin)) {
        ctx.status = 403;
        ctx.body = {
            error: "forbidden_origin",
            message: "Protected RPC requests must come from an allowed Origin (e.g. the Zelf extension).",
        };
        return;
    }

    await next();
};

module.exports = {
    requireAllowedProtectedRpcOrigin,
};
