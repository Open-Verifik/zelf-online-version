const Module = require("../modules/canton-transfer.module");
const { errorHandler } = require("../../../Core/http-handler");

const handle = async (ctx, callback) => {
    try {
        ctx.body = { data: await callback() };
    } catch (error) {
        const exception = errorHandler(error);
        ctx.status = exception.status || 500;
        ctx.body = { code: exception.code, message: exception.message };
    }
};

const prepare = async (ctx) => handle(ctx, () => Module.prepareTransfer(ctx.request.body));
const submit = async (ctx) => handle(ctx, () => Module.submitTransfer(ctx.request.body));

module.exports = {
    prepare,
    submit,
};
