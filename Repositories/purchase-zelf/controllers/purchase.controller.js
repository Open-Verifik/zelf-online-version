const Module = require("../modules/purchase.module");

const searchZelfLease = async (ctx) => {
	try {
		const { zelfName } = ctx.request.body;

		const data = await Module.searchZelfLease(`${zelfName}`.toLowerCase());

		ctx.body = { data };
	} catch (error) {
		console.error(error);

		ctx.status = error.status || 500;

		ctx.body = { error: error.message };
	}
};

const selectMethod = async (ctx) => {
	const { network, price } = ctx.request.body;

	try {
		const data = await Module.selectMethod(network, price);

		ctx.body = { data };
	} catch (error) {
		console.error(error);

		ctx.status = error.status || 500;

		ctx.body = { error: error.message };
	}
};

const pay = async (ctx) => {
	const { zelfName } = ctx.request.params;
	const { network, signedDataPrice, paymentAddress } = ctx.request.body;

	try {
		const data = await Module.pay(zelfName, network, signedDataPrice, paymentAddress);

		ctx.body = { data };
	} catch (error) {
		console.error(error);

		ctx.status = error.status || 500;

		ctx.body = { error: error.message };
	}
};

const receiptEmail = async (ctx) => {
	try {
		const data = await Module.getReceiptEmail(ctx.request.body);

		ctx.body = { data };
	} catch (error) {
		console.error(error);

		ctx.status = error.status || 500;

		ctx.body = { error: error.message };
	}
};

module.exports = {
	searchZelfLease,
	selectMethod,
	receiptEmail,
	pay,
};
