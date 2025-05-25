const config = require("../../../Core/config");
const Controller = require("../controllers/solana-scrapping.controller");
const SessionMiddleware = require("../../Session/middlewares/session.middleware");
const Middleware = require("../middlewares/solana-scrapping.middleware");

const base = "/solana";

module.exports = (server) => {
	const PATH = config.basePath(base);

	server.get(`${PATH}/address/:id`, SessionMiddleware.validateJWT, Controller.getAddress);

	server.get(`${PATH}/token/:id`, SessionMiddleware.validateJWT, Middleware.validateToken, Controller.getToken);

	server.get(`${PATH}/transaction/:id`, SessionMiddleware.validateJWT, Middleware.validateTransactionHash, Controller.transaction);

	server.get(`${PATH}/transactions/:id`, SessionMiddleware.validateJWT, Middleware.validateAddressTransactions, Controller.transactions);

	server.get(`${PATH}/gas-tracker`, SessionMiddleware.validateJWT, Controller.gasTracker);

	server.get(`${PATH}/transfers/:id`, SessionMiddleware.validateJWT, Middleware.validateAddressTransactions, Controller.transfers);
};
