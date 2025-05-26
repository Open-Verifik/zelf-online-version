const Module = require("../modules/etherscan-scrapping.module");
const HttpHandler = require("../../../Core/http-handler");

const address = async (ctx) => {
	try {
		const data = await Module.getAddress(ctx.request.query);

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

const transactionsList = async (ctx) => {
	try {
		const data = await Module.getTransactionsList(ctx.request.query);

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

const transactionStatusV2 = async (ctx) => {
	try {
		const data = await Module.getTransactionStatusV2(ctx.request.params);

		ctx.body = { data };
	} catch (error) {
		console.error(error);

		ctx.status = error.status || 500;

		ctx.body = { error: error.message };
	}
};

module.exports = {
	address,
	gasTracker,
	transactionStatus,
	transactionStatusV2,
	transactionsList,
};
