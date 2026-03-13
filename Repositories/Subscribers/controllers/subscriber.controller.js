const Module = require("../modules/subscriber.module");
const { errorHandler } = require("../../../Core/http-handler");

const subscribe = async (ctx) => {
    try {
        const data = await Module.subscribe(
            { ...ctx.request.body, language: ctx.request.body.locale || ctx.request.body.language || "en" },
            ctx.state.user
        );

        ctx.body = { data };
    } catch (error) {
        const _exception = errorHandler(error, ctx);

        ctx.status = _exception.status || 500;

        ctx.body = {
            code: _exception.code,
            message: _exception.message,
        };
    }
};

const unsubscribe = async (ctx) => {
    try {
        const data = await Module.unsubscribe(ctx.request.body, ctx.state.user);

        ctx.body = { data };
    } catch (error) {
        const _exception = errorHandler(error, ctx);

        ctx.status = _exception.status || 500;

        ctx.body = {
            code: _exception.code,
            message: _exception.message,
        };
    }
};

module.exports = {
    subscribe,
    unsubscribe,
};
