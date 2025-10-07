const Controller = require("../controllers/stripe.controller");
const Middleware = require("../middlewares/stripe.middleware");

const PATH = "/api";

/**
 * Stripe webhook routes
 * These routes are unprotected and handle Stripe webhook events
 */
module.exports = (server) => {
	// Stripe webhook endpoint
	server.post(`${PATH}/webhook`, Middleware.webhookValidation, Controller.handleWebhook);
};
