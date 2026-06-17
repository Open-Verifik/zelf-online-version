const Module = require("../modules/ton-payment-verify.module");
const { errorHandler } = require("../../../Core/http-handler");

const getServiceWallet = async (ctx) => {
	try {
		const data = await Module.getServiceWallet();
		ctx.body = data;
	} catch (error) {
		const _exception = errorHandler(error);
		ctx.status = _exception.status || 500;
		ctx.body = { code: _exception.code, message: _exception.message };
	}
};

const confirmPayment = async (ctx) => {
	try {
		const data = await Module.confirmPayment(ctx.request.body);
		ctx.body = data;
	} catch (error) {
		const _exception = errorHandler(error);
		ctx.status = _exception.status || 500;
		ctx.body = { code: _exception.code, message: _exception.message };
	}
};

module.exports = {
	getServiceWallet,
	confirmPayment,
};
