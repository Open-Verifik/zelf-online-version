const Module = require("../modules/alchemy.module");
const { errorHandler } = require("../../../Core/http-handler");

const getBalances = async (ctx) => {
    try {
        const data = await Module.getBalances(ctx.state.alchemyRequest, ctx.state.user);

        ctx.body = { data };
    } catch (error) {
        const exception = errorHandler(error, ctx);

        ctx.status = exception.status;
        ctx.body = { message: exception.message, code: exception.code };
    }
};

const getTransactions = async (ctx) => {
    try {
        const data = await Module.getTransactions(ctx.state.alchemyRequest, ctx.state.user);

        ctx.body = { data };
    } catch (error) {
        const exception = errorHandler(error, ctx);

        ctx.status = exception.status;
        ctx.body = { message: exception.message, code: exception.code };
    }
};

const getTransaction = async (ctx) => {
    try {
        const data = await Module.getTransaction(ctx.state.alchemyRequest, ctx.state.user);

        ctx.body = { data };
    } catch (error) {
        const exception = errorHandler(error, ctx);

        ctx.status = exception.status;
        ctx.body = { message: exception.message, code: exception.code };
    }
};

module.exports = {
    getBalances,
    getTransactions,
    getTransaction,
};
