const Module = require("../modules/solana-scrapping.module");
const HttpHandler = require("../../../Core/http-handler");

const getAddress = async (ctx) => {
	try {
		const data = await Module.getAddress({ ...ctx.request.query, ...ctx.request.params });

		ctx.body = { data };
	} catch (error) {
		console.error(error);

		ctx.status = error.status || 500;

		ctx.body = { error: error.message };
	}
};
const getToken = async (ctx) => {
	const params = ctx.request.params;

	const query = ctx.request.query;

	try {
		const data = await Module.getTokens(params, query);

		ctx.body = { data };
	} catch (error) {
		console.error(error);

		ctx.status = error.status || 500;

		ctx.body = { error: error.message };
	}
};

const transactions = async (ctx) => {
	try {
		const data = await Module.getTransactions(ctx.request.params, ctx.request.query);

		ctx.body = { data };
	} catch (error) {
		console.error(error);

		ctx.status = error.status || 500;

		ctx.body = { error: error.message };
	}
};

const transaction = async (ctx) => {
	try {
		const data = await Module.getTransaction(ctx.request.params);

		ctx.body = { data };
	} catch (error) {
		console.error(error);

		ctx.status = error.status || 500;

		ctx.body = { error: error.message };
	}
};

const transfers = async (ctx) => {
	try {
		const data = await Module.getTransactions(ctx.request.params, ctx.request.query);

		ctx.body = { data };
	} catch (error) {
		console.error(error);

		ctx.status = error.status || 500;

		ctx.body = { error: error.message };
	}
};

const transfer = async (ctx) => {
	try {
		const data = await Module.getTransaction(ctx.request.params);

		ctx.body = { data };
	} catch (error) {
		console.error(error);

		ctx.status = error.status || 500;

		ctx.body = { error: error.message };
	}
};

const gasTracker = async (ctx) => {
	try {
		const data = await Module.getGasTracker();

		ctx.body = { data };
	} catch (error) {
		console.error(error);

		ctx.status = error.status || 500;

		ctx.body = { error: error.message };
	}
};
module.exports = {
	getAddress,
	getToken,
	transactions,
	transaction,
	transfers,
	transfer,
	gasTracker,
};
