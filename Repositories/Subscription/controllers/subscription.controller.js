const Module = require("../modules/subscription.module.js");

const getActiveSubscription = async (ctx) => {
	try {
		const data = await Module.getActiveSubscription(ctx.state.user);

		ctx.status = data?.url ? 200 : 404;
		ctx.body = {
			success: Boolean(data?.url),
			data,
			message: data?.url ? "Active subscription found" : "No active subscription found",
		};
	} catch (error) {
		console.error(error);

		ctx.status = error.status || 500;
		ctx.body = { error: error.message };
	}
};

const getAvailablePlans = async (ctx) => {
	try {
		const data = await Module.getAvailablePlans();

		ctx.status = 200;
		ctx.body = {
			success: true,
			plans: data.plans,
		};
	} catch (error) {
		console.error(error);

		ctx.status = error.status || 500;
		ctx.body = { error: error.message };
	}
};

const createCheckoutSession = async (ctx) => {
	try {
		const data = await Module.createCheckoutSession(ctx.request.body, ctx.state.user);

		ctx.status = 200;
		ctx.body = {
			success: true,
			checkoutUrl: data.checkoutUrl,
			sessionId: data.sessionId,
		};
	} catch (error) {
		console.error(error);

		ctx.status = error.status || 500;
		ctx.body = { error: error.message };
	}
};

const cancelSubscription = async (ctx) => {
	try {
		const data = await Module.cancelSubscription(ctx.state.user);

		ctx.status = 200;
		ctx.body = {
			success: true,
			message: data.message || "Subscription canceled successfully",
		};
	} catch (error) {
		console.error(error);

		ctx.status = error.status || 500;
		ctx.body = { error: error.message };
	}
};

const createCustomerPortalSession = async (ctx) => {
	try {
		const data = await Module.createCustomerPortalSession(ctx.state.user);

		ctx.status = 200;
		ctx.body = {
			success: true,
			portalUrl: data.portalUrl,
			sessionId: data.sessionId,
		};
	} catch (error) {
		console.error(error);

		ctx.status = error.status || 500;
		ctx.body = { error: error.message };
	}
};

const createCryptoPayment = async (ctx) => {
	try {
		const data = await Module.createCryptoPayment(ctx.request.body, ctx.state.user);

		ctx.status = 200;
		ctx.body = { data };
	} catch (error) {
		console.error(error);

		ctx.status = error.status || 500;
		ctx.body = { error: error.message };
	}
};

const confirmCryptoPayment = async (ctx) => {
	try {
		const data = await Module.confirmCryptoPayment(ctx.request.body, ctx.state.user);

		ctx.status = 200;
		ctx.body = {
			success: data.success,
			paymentConfirmed: data.paymentConfirmed,
			transactionHash: data.transactionHash,
			subscriptionCreated: data.subscriptionCreated,
			message: data.message,
		};
	} catch (error) {
		console.error("Error confirming crypto payment:", error);

		ctx.status = error.status || 500;
		ctx.body = {
			success: false,
			error: error.message,
			paymentConfirmed: false,
		};
	}
};

const webhookHandler = async (ctx) => {
	try {
		const data = await Module.webhookHandler(ctx.request.body, ctx.headers);

		ctx.status = 200;
		ctx.body = {
			success: true,
			message: "Webhook received",
			processed: data,
		};
	} catch (error) {
		console.error("Webhook error in controller:", error);

		ctx.status = error.status || 500;
		ctx.body = {
			error: error.message,
			details: error.stack,
		};
	}
};

module.exports = {
	getActiveSubscription,
	getAvailablePlans,
	createCheckoutSession,
	cancelSubscription,
	createCustomerPortalSession,
	createCryptoPayment,
	confirmCryptoPayment,
	webhookHandler,
};
