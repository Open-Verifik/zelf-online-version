const Module = require("../modules/binance.module");
const HttpHandler = require("../../../Core/http-handler");

const tickerPrice = async (ctx) => {
	try {
		const data = await Module.getTickerPrice(ctx.request.query);

		ctx.body = { data };
	} catch (error) {
		console.error(error);

		ctx.status = error.status || 500;

		ctx.body = { error: error.message };
	}
};

const Klines = async (ctx) => {
	try {
		const data = await Module.getKlines(ctx.request.query);

		ctx.body = { data };
	} catch (error) {
		console.error(error);

		ctx.status = error.status || 500;

		ctx.body = { error: error.message };
	}
};

module.exports = {
	tickerPrice,
	Klines,
};
