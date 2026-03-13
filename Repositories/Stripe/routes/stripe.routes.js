const Controller = require("../controllers/stripe.controller");
const Middleware = require("../middlewares/stripe.middleware");
const config = require("../../../Core/config");

const base = "/stripe";

module.exports = (server) => {
	const PATH = config.basePath(base);

	server.post(`${PATH}/webhook`, Middleware.webhookValidation, Controller.handleWebhook);

	server.get(`${PATH}/stripe/result`, Controller.handleStripeResult);
};
