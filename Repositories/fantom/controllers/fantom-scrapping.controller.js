const Module = require("../modules/fantom-scrapping.module");

const address = async (ctx) => {
	try {
		const data = await Module.getAddress(ctx.request.query);
		ctx.body = data; // Return data directly, not wrapped
	} catch (error) {
		console.error("Fantom address error:", error.message || "Unknown error");
		ctx.status = error.status || 500;
		ctx.body = { error: error.message };
	}
};

const transactionsList = async (ctx) => {
	try {
		const data = await Module.getTransactionsList(ctx.request.query);
		ctx.body = { data };
	} catch (error) {
		console.error("Fantom transactions error:", error.message || "Unknown error");
		ctx.status = error.status || 500;
		ctx.body = { error: error.message };
	}
};

const transactionStatus = async (ctx) => {
	try {
		const data = await Module.getTransactionStatus(ctx.params);
		ctx.body = { data };
	} catch (error) {
		console.error("Fantom transaction status error:", error.message || "Unknown error");
		ctx.status = error.status || 500;
		ctx.body = { error: error.message };
	}
};

const gasTracker = async (ctx) => {
	try {
		const data = await Module.getGasTracker(ctx.request.query);
		ctx.body = { data };
	} catch (error) {
		console.error("Fantom gas tracker error:", error.message || "Unknown error");
		ctx.status = error.status || 500;
		ctx.body = { error: error.message };
	}
};

module.exports = {
	address,
	transactionsList,
	transactionStatus,
	gasTracker,
};
