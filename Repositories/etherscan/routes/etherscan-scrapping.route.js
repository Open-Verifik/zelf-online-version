const config = require("../../../Core/config");
const Controller = require("../controllers/etherscan-scrapping.controller");
const SessionMiddleware = require("../../Session/middlewares/session.middleware");
const Middleware = require("../middlewares/etherscan.middleware");

const base = "/ethereum";

module.exports = (server) => {
	const PATH = config.basePath(base);

	server.get(`${PATH}/address`, SessionMiddleware.validateJWT, Middleware.validateAddress, Controller.address);

	server.get(`${PATH}/transactions`, SessionMiddleware.validateJWT, Middleware.validateAddressTransactions, Controller.transactionsList);

	server.get(`${PATH}/transaction/:id`, SessionMiddleware.validateJWT, Controller.transactionStatus);

	server.get(`${PATH}/v2/transaction/:id`, SessionMiddleware.validateJWT, Controller.transactionStatusV2);

	server.get(`${PATH}/gas-tracker`, SessionMiddleware.validateJWT, Controller.gasTracker);

	server.post(`${PATH}/gas-tracker`, SessionMiddleware.validateJWT, Controller.gasTracker);
};
