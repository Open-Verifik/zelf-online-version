const Module = require("../modules/rpc-caller.module");

const listTop = async (ctx) => {
    try {
        const q = ctx.state.rpcCallerListQuery || {};
        const data = await Module.listTopByVolume({
            limit: q.limit,
            skip: q.skip,
        });
        ctx.body = { data };
    } catch (error) {
        ctx.status = error.status || 500;
        ctx.body = { error: error.message };
    }
};

const ban = async (ctx) => {
    try {
        const { ip, reason } = ctx.request.body;
        const data = await Module.banIp(ip, reason);
        ctx.body = { data };
    } catch (error) {
        ctx.status = error.status || 500;
        ctx.body = { error: error.message };
    }
};

const unban = async (ctx) => {
    try {
        const { ip } = ctx.request.body;
        const data = await Module.unbanIp(ip);
        ctx.body = { data };
    } catch (error) {
        ctx.status = error.status || 500;
        ctx.body = { error: error.message };
    }
};

module.exports = {
    listTop,
    ban,
    unban,
};
