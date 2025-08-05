const config = require("../../../Core/config");
const Controller = require("../controllers/kava-scrapping.controller");
const SessionMiddleware = require("../../Session/middlewares/session.middleware");
const Middleware = require("../middlewares/kava.middleware");

const base = "/kava";

module.exports = (server) => {
	const PATH = config.basePath(base);

	server.get(`${PATH}/address/:id`, SessionMiddleware.validateJWT, Middleware.validateAddress, Controller.address);

	server.get(
		`${PATH}/address/:id/transactions`,
		SessionMiddleware.validateJWT,
		Middleware.validateAddressTransactions,
		Controller.transactionsList
	);

	server.get(`${PATH}/transaction/:id`, SessionMiddleware.validateJWT, Controller.transactionStatus);

	server.get(`${PATH}/gas-tracker`, SessionMiddleware.validateJWT, Controller.gasTracker);

	server.post(`${PATH}/gas-tracker`, SessionMiddleware.validateJWT, Controller.gasTracker);
};
