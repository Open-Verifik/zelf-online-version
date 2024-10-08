const Module = require("../modules/etherscan.module");

const balance = async (ctx) => {
	try {
		const data = await Module.getBalance(ctx.request.query);

		ctx.body = { data };
	} catch (error) {
		console.error(error);

		ctx.status = error.status || 500;

		ctx.body = { error: error.message };
	}
};

const blocke = async (ctx) => {
	try {
		const data = await Module.getBlocke(ctx.request.query);

		ctx.body = { data };
	} catch (error) {
		console.error(error);

		ctx.status = error.status || 500;

		ctx.body = { error: error.message };
	}
};

const transactions = async (ctx) => {
	try {
		const data = await Module.getTransactions(ctx.request.query);

		ctx.body = { data };
	} catch (error) {
		ctx.status = error.status || 500;

		ctx.body = { error: error.message };
	}
};

const tokentx = async (ctx) => {
	try {
		const data = await Module.getTokentx(ctx.request.query);

		ctx.body = { data };
	} catch (error) {
		ctx.status = error.status || 500;

		ctx.body = { error: error.message };
	}
};

const gasTracker = async (ctx) => {
	try {
		const data = await Module.getGasTracker(ctx.request.query);

		ctx.body = { data };
	} catch (error) {
		ctx.status = error.status || 500;

		ctx.body = { error: error.message };
	}
};
module.exports = {
	transactions,
	gasTracker,
	balance,
	blocke,
	tokentx,
};
