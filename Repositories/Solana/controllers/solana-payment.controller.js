const Module = require("../modules/fee-payer-payment.module");
const { errorHandler } = require("../../../Core/http-handler");

const createAndSubmitPayment = async (ctx) => {
	try {
		const data = await Module.createAndSubmitPayment(ctx.request.body, ctx.state.user);
		ctx.body = data;
	} catch (error) {
		const _exception = errorHandler(error);
		ctx.status = _exception.status || 500;
		ctx.body = {
			code: _exception.code,
			message: _exception.message,
		};
	}
};

const getServiceWallet = async (ctx) => {
	try {
		const data = await Module.getServiceWallet();
		ctx.body = data;
	} catch (error) {
		const _exception = errorHandler(error);
		ctx.status = _exception.status || 500;
		ctx.body = {
			code: _exception.code,
			message: _exception.message,
		};
	}
};

module.exports = {
	createAndSubmitPayment,
	getServiceWallet,
};
