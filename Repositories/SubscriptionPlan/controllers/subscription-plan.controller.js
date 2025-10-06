const Module = require("../modules/subscription-plan.module");
const { errorHandler } = require("../../../Core/http-handler");

const list = async (ctx) => {
	try {
		const data = await Module.listSubscriptionPlans();

		ctx.body = { data, count: data.length };
	} catch (error) {
		const _exception = errorHandler(error, ctx);

		ctx.status = _exception.status;

		ctx.body = { message: _exception.message, code: _exception.code };
	}
};

const getById = async (ctx) => {
	try {
		const { productId } = ctx.request.params;

		const data = await Module.getSubscriptionPlan(productId);
		ctx.body = { data };
	} catch (error) {
		const _exception = errorHandler(error, ctx);
		ctx.status = _exception.status;
		ctx.body = { message: _exception.message, code: _exception.code };
	}
};

module.exports = {
	list,
	getById,
};
