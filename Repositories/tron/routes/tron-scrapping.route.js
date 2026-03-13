const config = require("../../../Core/config");
const Controller = require("../controllers/tron-scrapping.controller");
const SessionMiddleware = require("../../Session/middlewares/session.middleware");
const Middleware = require("../middlewares/tron-scrapping.middleware");

const base = "/tron";

module.exports = (server) => {
	const PATH = config.basePath(base);

	server.get(`${PATH}/address/:address`, SessionMiddleware.validateJWT, Middleware.validateAddress, Controller.address);

	server.get(
		`${PATH}/address/:address/transactions`,
		SessionMiddleware.validateJWT,
		Middleware.validateAddressTransactions,
		Controller.transactions
	);

	server.get(`${PATH}/address/:address/tokens`, SessionMiddleware.validateJWT, Middleware.validateAddress, Controller.tokens);

	server.get(`${PATH}/address/:address/transaction/:id`, SessionMiddleware.validateJWT, Controller.transactionStatus);

	server.get(`${PATH}/address/:address/portfolio`, SessionMiddleware.validateJWT, Middleware.validateAddress, Controller.portfolioSummary);

	server.get(`${PATH}/energy-tracker`, SessionMiddleware.validateJWT, Controller.gasTracker);

	server.post(`${PATH}/energy-tracker`, SessionMiddleware.validateJWT, Controller.gasTracker);
};
