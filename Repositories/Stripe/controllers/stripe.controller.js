const Module = require("../modules/stripe.module");

/**
 * Handle Stripe webhook events
 */
const handleWebhook = async (ctx) => {
	try {
		// Use the verified event from middleware instead of raw request body
		const event = ctx.webhookEvent;

		// Process the webhook event
		const result = await Module.processWebhookEvent(event);

		ctx.status = 200;
		ctx.body = { received: true, processed: result };
	} catch (error) {
		console.error("Error processing webhook:", error);
		ctx.status = 400;
		ctx.body = { error: "Webhook processing failed" };
	}
};

module.exports = {
	handleWebhook,
};
