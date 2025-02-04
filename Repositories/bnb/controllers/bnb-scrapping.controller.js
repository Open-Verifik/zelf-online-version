const Module = require("../modules/bnb-scrapping.module");
const HttpHandler = require("../../../Core/http-handler");

const getAddress = async (ctx) => {
	try {
		const data = await Module.getAddress(ctx.request.params);

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

const transactionsList = async (ctx) => {
	try {
		const data = await Module.getTransactionsList(
			ctx.request.params,
			ctx.request.query
		);

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
module.exports = {
	getAddress,
	getToken,
	transactionStatus,
	transactionsList,
};
