const Module = require("../modules/purchase.module");
const HttpHandler = require("../../../Core/http-handler");

const search_zelf_lease = async (ctx) => {
	try {
		const { zelfName } = ctx.request.body;

		const data = await Module.search_zelf_lease(zelfName);

		ctx.body = { data };
	} catch (error) {
		console.error(error);

		ctx.status = error.status || 500;

		ctx.body = { error: error.message };
	}
};

const select_method = async (ctx) => {
	const { crypto, price } = ctx.request.body;

	try {
		const data = await Module.select_method(crypto, price);

		ctx.body = { data };
	} catch (error) {
		console.error(error);

		ctx.status = error.status || 500;

		ctx.body = { error: error.message };
	}
};

const pay = async (ctx) => {
	const { zelfName } = ctx.request.params;
	const { crypto, signedDataPrice, paymentAddress } = ctx.request.body;

	try {
		const data = await Module.pay(
			zelfName,
			crypto,
			signedDataPrice,
			paymentAddress
		);

		ctx.body = { data };
	} catch (error) {
		console.error(error);

		ctx.status = error.status || 500;

		ctx.body = { error: error.message };
	}
};

const lease_confirmation_pay = async (ctx) => {
	try {
		const data = await Module.getLease_confirmation_pay(ctx.request.params);

		ctx.body = { data };
	} catch (error) {
		console.error(error);

		ctx.status = error.status || 500;

		ctx.body = { error: error.message };
	}
};

module.exports = {
	search_zelf_lease,
	select_method,
	pay,
	lease_confirmation_pay,
};
