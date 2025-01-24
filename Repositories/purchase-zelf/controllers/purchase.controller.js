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

const select_method = async (ctx) => {
	const { crypto, zelfName, duration } = ctx.request.query;
	const { id } = ctx.request.params;

	console.log(crypto, zelfName, duration, id);

	try {
		const data = await Module.select_method(crypto, zelfName, duration, id);

		ctx.body = { data };
	} catch (error) {
		console.error(error);

		ctx.status = error.status || 500;

		ctx.body = { error: error.message };
	}
};

const select_method_coibase = async (ctx) => {
	const { crypto, zelfName, duration } = ctx.request.query;
	const { id } = ctx.request.params;

	console.log(crypto, zelfName, duration, id);

	try {
		const data = await Module.select_method(crypto, zelfName, duration, id);

		ctx.body = { data };
	} catch (error) {
		console.error(error);

		ctx.status = error.status || 500;

		ctx.body = { error: error.message };
	}
};

const setp = async (ctx) => {
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
const clock_sync = async (ctx) => {
	try {
		const data = await Module.clock_sync(ctx.request.params);

		ctx.body = { data };
	} catch (error) {
		console.error(error);

		ctx.status = error.status || 500;

		ctx.body = { error: error.message };
	}
};

const pay = async (ctx) => {
	try {
		const data = await Module.pay(ctx.request.params);

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
	checkout,
	select_method_coibase,
	setp,
	clock_sync,
	select_method,
	pay,
	lease_confirmation_pay,
};
