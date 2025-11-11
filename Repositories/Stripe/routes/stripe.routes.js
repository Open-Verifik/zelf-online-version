const Controller = require("../controllers/stripe.controller");
const Middleware = require("../middlewares/stripe.middleware");
const config = require("../../../Core/config");

const API_PATH = "/api";
const base = "/stripe";

module.exports = (server) => {
	server.post(`${API_PATH}/webhook`, Middleware.webhookValidation, Controller.handleWebhook);

	const PATH = config.basePath(base);

	server.get(`${PATH}/stripe/result`, Controller.handleStripeResult);
};
