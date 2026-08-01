const Module = require("../modules/aptos-scrapping.module");
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

const address = async (ctx) => handle(ctx, () => Module.getAddress(ctx.request.params));
const tokens = async (ctx) => handle(ctx, () => Module.getTokens(ctx.request.params, ctx.request.query));
const transaction = async (ctx) => handle(ctx, () => Module.getTransaction(ctx.request.params));
const transactions = async (ctx) => handle(ctx, () => Module.getTransactions(ctx.request.params, ctx.request.query));

module.exports = {
    address,
    tokens,
    transaction,
    transactions,
};
