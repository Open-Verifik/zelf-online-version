const Module = require("../modules/sui-scrapping.module");

const address = async (ctx) => {
	try {
		const data = await Module.getAddress(ctx.request.params);

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

const tokens = async (ctx) => {
	try {
		const data = await Module.getTokens(ctx.request.params, ctx.request.query);

		ctx.body = { data };
	} catch (error) {
		console.error(error);

		ctx.status = error.status || 500;

		ctx.body = { error: error.message };
	}
};
module.exports = {
	address,
	transactions,
	transaction,
	tokens,
};
