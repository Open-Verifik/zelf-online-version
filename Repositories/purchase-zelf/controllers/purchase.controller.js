const Module = require("../modules/purchase.module");
const HttpHandler = require("../../../Core/http-handler");

const checkout = async (ctx) => {
	try {
		const data = await Module.getCheckout(ctx.request.params);

		ctx.body = { data };
	} catch (error) {
		console.error(error);

		ctx.status = error.status || 500;

		ctx.body = { error: error.message };
	}
};
const tickerPrice = async (ctx) => {
	try {
		const { crypto, zelfName, duration } = ctx.request.query;

		const data = await Module.transactionGenerate(crypto, zelfName, duration);

		ctx.body = { data };
	} catch (error) {
		console.error(error);

		ctx.status = error.status || 500;

		ctx.body = { error: error.message };
	}
};

module.exports = {
	checkout,
	tickerPrice,
};
