const config = require("../../../Core/config");
const { string, number, validate } = require("../../../Core/JoiUtils");

const schemas = {
    ban: {
        ip: string().required(),
        reason: string().allow(null, "").optional(),
    },
    unban: {
        ip: string().required(),
    },
    listTop: {
        limit: number().integer().min(1).max(200).optional(),
        skip: number().integer().min(0).optional(),
    },
};

const requireAdminSecret = async (ctx, next) => {
    const secret = config.rpc?.callerAdminSecret;
    if (!secret) {
        ctx.status = 503;
        ctx.body = { error: "rpc_caller_admin_disabled" };
        return;
    }

    const header = ctx.get("x-rpc-caller-admin");
    if (header !== secret) {
        ctx.status = 403;
        ctx.body = { error: "forbidden" };
        return;
    }

    await next();
};

const banValidation = async (ctx, next) => {
    const valid = validate(schemas.ban, ctx.request.body);
    if (valid.error) {
        ctx.status = 400;
        ctx.body = { validationError: valid.error.message };
        return;
    }
    ctx.request.body = valid.value;
    await next();
};

const unbanValidation = async (ctx, next) => {
    const valid = validate(schemas.unban, ctx.request.body);
    if (valid.error) {
        ctx.status = 400;
        ctx.body = { validationError: valid.error.message };
        return;
    }
    ctx.request.body = valid.value;
    await next();
};

const listTopValidation = async (ctx, next) => {
    const valid = validate(schemas.listTop, ctx.query);
    if (valid.error) {
        ctx.status = 400;
        ctx.body = { validationError: valid.error.message };
        return;
    }
    ctx.state.rpcCallerListQuery = valid.value;
    await next();
};

module.exports = {
    requireAdminSecret,
    banValidation,
    unbanValidation,
    listTopValidation,
};
