const Stripe = require("stripe");
const config = require("../../../Core/config");

/**
 * Validate Stripe webhook signature
 * This ensures the webhook request is actually from Stripe
 */
const webhookValidation = async (ctx, next) => {
	try {
		const signature = ctx.request.headers["stripe-signature"];

		if (!signature) {
			ctx.status = 400;
			ctx.body = { error: "Missing stripe-signature header" };
			return;
		}

		// Get webhook secret from environment
		const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

		if (!webhookSecret) {
			console.error("STRIPE_WEBHOOK_SECRET not configured");
			ctx.status = 500;
			ctx.body = { error: "Webhook secret not configured" };
			return;
		}

		// Get Stripe client
		const stripe = Stripe(config.stripe.secretKey);

		// Get the raw request body - this is critical for signature verification
		let requestBody;

		// Try to get raw body first
		if (ctx.request.rawBody) {
			requestBody = ctx.request.rawBody;
		} else if (ctx.request.body && typeof ctx.request.body === "string") {
			requestBody = ctx.request.body;
		} else {
			// Fallback: stringify the parsed body
			requestBody = JSON.stringify(ctx.request.body);
		}

		// Use Stripe's official webhook verification
		let event;
		try {
			event = stripe.webhooks.constructEvent(requestBody, signature, webhookSecret);
		} catch (err) {
			console.error("Webhook signature verification failed:", err.message);
			ctx.status = 400;
			ctx.body = { error: "Webhook signature verification failed" };
			return;
		}

		// Attach the verified event to the context for the controller
		ctx.webhookEvent = event;

		// Proceed to next middleware
		await next();
	} catch (error) {
		console.error("Webhook validation error:", error);
		ctx.status = 400;
		ctx.body = { error: "Webhook validation failed" };
	}
};

module.exports = {
	webhookValidation,
};
