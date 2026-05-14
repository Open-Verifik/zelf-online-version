const Module = require("../modules/subscription-plan.module");
const { reconcileSubscriptionZnsGrants } = require("../modules/subscription-zns-reconcile.module");
const { errorHandler } = require("../../../Core/http-handler");

const config = require("../../../Core/config");

const list = async (ctx) => {
	try {
		const data = await Module.listSubscriptionPlans();

		ctx.body = {
			data,
			count: data.length,
			pricingMeta: typeof config.buildSubscriptionPricingMeta === "function" ? config.buildSubscriptionPricingMeta() : undefined,
		};
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

const verifySession = async (ctx) => {
	try {
		const { sessionId } = ctx.request.body;

		if (!sessionId) throw new Error("400:session_id_required");

		const result = await Module.verifySession(sessionId, ctx.state.user);

		ctx.body = result;
	} catch (error) {
		const _exception = errorHandler(error, ctx);

		ctx.status = _exception.status;

		ctx.body = { message: _exception.message, code: _exception.code };
	}
};

const reconcileZns = async (ctx) => {
	try {
		const data = await reconcileSubscriptionZnsGrants(ctx.state.user);

		ctx.body = { data };

		console.info("[subscription-zns-reconcile] http_response", {
			reconciled: data.reconciled,
			skippedReason: data.skippedReason,
			actionCount: data.actions?.length ?? 0,
		});
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
	verifySession,
	reconcileZns,
};
