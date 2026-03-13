const Module = require("../modules/stellar-scrapping.module");

const getAddress = async (ctx) => {
	try {
		const data = await Module.getAddress(ctx.request.params, ctx.request.query);

		ctx.body = { data };
	} catch (error) {
		console.error(error);

		ctx.status = error.response?.status || error.status || 500;

		ctx.body = { error: error.response?.data?.detail || error.message };
	}
};

const getTransactionDetail = async (ctx) => {
	try {
		const data = await Module.getTransactionDetail(ctx.request.params);

		ctx.body = { data };
	} catch (error) {
		console.error(error);

		ctx.status = error.response?.status || error.status || 500;

		ctx.body = { error: error.response?.data?.detail || error.message };
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

		ctx.status = error.response?.status || error.status || 500;

		ctx.body = { error: error.response?.data?.detail || error.message };
	}
};

module.exports = {
	getAddress,
	getTransactionDetail,
	transactionsList,
};
