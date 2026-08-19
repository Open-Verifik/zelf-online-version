const Module = require("../modules/canton-scrapping.module");
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

const status = async (ctx) => handle(ctx, () => Module.getStatus({ probe: ctx.request.query.probe === "true" }));
const address = async (ctx) => handle(ctx, () => Module.getAddress(ctx.request.params));
const tokens = async (ctx) => handle(ctx, () => Module.getTokens(ctx.request.params));
const transactions = async (ctx) => handle(ctx, () => Module.getTransactions(ctx.request.params, ctx.request.query));
const transaction = async (ctx) => handle(ctx, () => Module.getTransaction(ctx.request.params));

module.exports = {
    address,
    status,
    tokens,
    transaction,
    transactions,
};
