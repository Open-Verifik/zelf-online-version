const config = require("../../../Core/config");
const Controller = require("../controllers/sui-scrapping.controller");
const SessionMiddleware = require("../../Session/middlewares/session.middleware");
const Middleware = require("../middlewares/sui-middleware");

const base = "/sui";

module.exports = (server) => {
	const PATH = config.basePath(base);

	server.get(
		`${PATH}/address/:id`,
		SessionMiddleware.validateJWT,
		//Middleware.validateAddress,
		Controller.address
	);

	server.get(
		`${PATH}/transactions`,
		SessionMiddleware.validateJWT,
		Middleware.validateAddressTransactions,
		Controller.transactionsList
	);

	server.get(
		`${PATH}/transaction/:id`,
		SessionMiddleware.validateJWT,
		Controller.transactionStatus
	);

	server.get(
		`${PATH}/gas-tracker`,
		SessionMiddleware.validateJWT,
		Controller.gasTracker
	);

	server.post(
		`${PATH}/gas-tracker`,
		SessionMiddleware.validateJWT,
		Controller.gasTracker
	);
};
