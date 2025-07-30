const Module = require("../modules/polygon-scrapping.module");

const balance = async (ctx) => {
	try {
		const data = await Module.getBalance(ctx.request.params);

		ctx.body = { data };
	} catch (error) {
		console.error(error);

		ctx.status = error.status || 500;

		ctx.body = { error: error.message };
	}
};

const transactionsList = async (ctx) => {
	try {
		const data = await Module.getTransactionsList(ctx.request.params, ctx.request.query);

		ctx.body = { data };
	} catch (error) {
		console.error(error);

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

		ctx.status = error.status || 500;

		ctx.body = { error: error.message };
	}
};

const gasTracker = async (ctx) => {
	try {
		const data = await Module.getGasTracker(ctx.request.query);

		ctx.body = { data };
	} catch (error) {
		console.error(error);

		ctx.status = error.status || 500;

		ctx.body = { error: error.message };
	}
};
module.exports = {
	balance,
	gasTracker,
	transactionStatus,
	transactionsList,
};
