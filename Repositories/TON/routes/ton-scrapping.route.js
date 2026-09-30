const config = require("../../../Core/config");
const Controller = require("../controllers/ton-scrapping.controller");
const SessionMiddleware = require("../../Session/middlewares/session.middleware");
const Middleware = require("../middlewares/ton-middleware");

const base = "/ton";

module.exports = (server) => {
	const PATH = config.basePath(base);

	server.get(`${PATH}/address/:id`, SessionMiddleware.validateJWT, Middleware.validateAddress, Controller.address);

	server.get(`${PATH}/address/:id/transactions`, SessionMiddleware.validateJWT, Middleware.validateAddress, Middleware.validateAddressTransactions, Controller.transactions);

	server.get(`${PATH}/transaction/:id`, SessionMiddleware.validateJWT, Controller.transaction);

	server.get(`${PATH}/address/:id/tokens`, SessionMiddleware.validateJWT, Middleware.validateAddress, Middleware.validateAddressTransactions, Controller.tokens);
};
