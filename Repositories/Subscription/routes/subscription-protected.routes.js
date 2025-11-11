const Controller = require("../controllers/subscription.controller.js");
const Middleware = require("../middlewares/subscription.middleware.js");
const config = require("../../../Core/config");

const base = "/subscription";

module.exports = (server) => {
	const PATH = config.basePath(base);

	server.get(`${PATH}/active`, Middleware.validateUserIdentifier, Controller.getActiveSubscription);
	server.post(`${PATH}/checkout`, Middleware.validateUserIdentifier, Middleware.validateCheckoutRequest, Controller.createCheckoutSession);
	server.post(`${PATH}/cancel`, Middleware.validateUserIdentifier, Controller.cancelSubscription);
	server.post(`${PATH}/portal`, Middleware.validateUserIdentifier, Controller.createCustomerPortalSession);
	server.post(`${PATH}/crypto-payment`, Middleware.validateUserIdentifier, Controller.createCryptoPayment);
	server.post(`${PATH}/confirm-crypto-payment`, Middleware.validateUserIdentifier, Controller.confirmCryptoPayment);
};
