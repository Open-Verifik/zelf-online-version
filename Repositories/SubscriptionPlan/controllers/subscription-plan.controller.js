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

const subscribe = async (ctx) => {
	try {
		const { productId, priceId } = ctx.request.body;

		const customerEmail = ctx.request.body.customerEmail || ctx.state.user.email;

		const session = await Module.createCheckoutSession(productId, priceId, customerEmail);

		ctx.body = {
			sessionId: session.id,
			url: session.url,
			success: true,
		};
	} catch (error) {
		const _exception = errorHandler(error, ctx);
		ctx.status = _exception.status;
		ctx.body = { message: _exception.message, code: _exception.code };
	}
};

const mySubscription = async (ctx) => {
	try {
		const data = await Module.getMySubscription(ctx.state.user);

		ctx.body = { data };
	} catch (error) {
		const _exception = errorHandler(error, ctx);

		ctx.status = _exception.status;

		ctx.body = { message: _exception.message, code: _exception.code };
	}
};

const createPortalSession = async (ctx) => {
	try {
		const session = await Module.createPortalSession(ctx.state.user);

		ctx.body = {
			url: session.url,
			success: true,
		};
	} catch (error) {
		const _exception = errorHandler(error, ctx);

		ctx.status = _exception.status;

		ctx.body = { message: _exception.message, code: _exception.code };
	}
};

module.exports = {
	list,
	getById,
	subscribe,
	mySubscription,
	createPortalSession,
};
