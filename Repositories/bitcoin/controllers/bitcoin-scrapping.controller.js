const Module = require("../modules/bitcoin-scrapping.module");
const HttpHandler = require("../../../Core/http-handler");

const balance = async (ctx) => {
	try {
		const data = await Module.getBalance(ctx.request.params);

		ctx.body = { data };
	} catch (error) {
		console.error({ error });

		const _exception = HttpHandler.errorHandler(error);

		ctx.status = _exception.status;
		ctx.body = { message: _exception.message, code: _exception.code };
	}
};

const getTestnetBalance = async (ctx) => {
	try {
		const data = await Module.getTestnetBalance(ctx.request.params);

		ctx.body = { data };
	} catch (error) {
		console.error({ error });

		const _exception = HttpHandler.errorHandler(error);

		ctx.status = _exception.status;
		ctx.body = { message: _exception.message, code: _exception.code };
	}
};

const getTransactionDetail = async (ctx) => {
	const params = ctx.request.params;
	const query = ctx.request.query;

	try {
		const data = await Module.getTransactionDetail(params, query);

		ctx.body = { data };
	} catch (error) {
		console.error({ error });

		const _exception = HttpHandler.errorHandler(error);

		ctx.status = _exception.status;
		ctx.body = { message: _exception.message, code: _exception.code };
	}
};

const transactionsList = async (ctx) => {
	try {
		const data = await Module.getTransactionsList(ctx.request.params, ctx.request.query);

		ctx.body = { data };
	} catch (error) {
		console.error({ error });

		const _exception = HttpHandler.errorHandler(error);

		ctx.status = _exception.status;
		ctx.body = { message: _exception.message, code: _exception.code };
	}
};

const testnetTransactionsList = async (ctx) => {
	try {
		const data = await Module.getTestnetTransactionsList(ctx.request.params, ctx.request.query);

		ctx.body = { data };
	} catch (error) {
		console.error({ error });

		ctx.status = error.status || 500;
		ctx.body = { error: error.message };
	}
};

const transactionStatus = async (ctx) => {
	try {
		const data = await Module.getTransactionStatus(ctx.request.params);

		ctx.body = { data };
	} catch (error) {
		console.error(error);

		const _exception = HttpHandler.errorHandler(error);

		ctx.status = _exception.status;
		ctx.body = { message: _exception.message, code: _exception.code };
	}
};

module.exports = {
	balance,
	getTestnetBalance,
	getTransactionDetail,
	transactionStatus,
	transactionsList,
	testnetTransactionsList,
};
