const Module = require("../modules/mina-scrapping.module");
const HttpHandler = require("../../../Core/http-handler");

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
const getToken = async (ctx) => {
	const params = ctx.request.params;

	const query = ctx.request.query;

	try {
		const data = await Module.getToken(params, query);

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
module.exports = {
	balance,
	getToken,
	transactionStatus,
	transactionsList,
};
