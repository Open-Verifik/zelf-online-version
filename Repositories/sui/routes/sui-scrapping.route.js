const config = require("../../../Core/config");
const Controller = require("../controllers/sui-scrapping.controller");
const SessionMiddleware = require("../../Session/middlewares/session.middleware");
const Middleware = require("../middlewares/sui-middleware");

const base = "/sui";

module.exports = (server) => {
	const PATH = config.basePath(base);

	server.get(`${PATH}/address/:id`, SessionMiddleware.validateJWT, Controller.address);

	server.get(`${PATH}/address/:id/transactions`, SessionMiddleware.validateJWT, Middleware.validateAddressTransactions, Controller.transactions);

	server.get(`${PATH}/transaction/:id`, SessionMiddleware.validateJWT, Controller.transaction);

	server.get(`${PATH}/address/:id/tokens`, SessionMiddleware.validateJWT, Middleware.validateAddressTransactions, Controller.tokens);
};
