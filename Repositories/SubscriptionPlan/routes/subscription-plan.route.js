const Controller = require("../controllers/subscription-plan.controller");
const Middleware = require("../middlewares/subscription-plan.middleware");
const config = require("../../../Core/config");
const base = "/subscription-plans";

module.exports = (server) => {
	const PATH = config.basePath(base);

	// GET /api/subscription-plans - list plans
	server.get(`${PATH}`, Controller.list);

	// get my subscription
	server.get(`${PATH}/my-subscription`, Middleware.mySubscriptionValidation, Controller.mySubscription);

	// GET /api/subscription-plans/:productId - get specific plan by product ID
	server.get(`${PATH}/:productId`, Middleware.getByIdValidation, Controller.getById);

	// now we need to create a subscribe action > will open a stripe checkout session
	server.post(`${PATH}/subscribe`, Middleware.subscribeValidation, Controller.subscribe);

	// create portal session for subscription management
	server.post(`${PATH}/create-portal-session`, Middleware.createPortalSessionValidation, Controller.createPortalSession);
};
