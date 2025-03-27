const config = require("../../../Core/config");
const Controller = require("../controllers/avalanche-scrapping.controller");
const SessionMiddleware = require("../../Session/middlewares/session.middleware");
const Middleware = require("../middlewares/avalanche-scrapping.middleware");

const base = "/avalanche";

module.exports = (server) => {
	const PATH = config.basePath(base);

	server.get(`${PATH}/address/:id`, SessionMiddleware.validateJWT, Controller.balance);

	server.get(`${PATH}/address/:id/transactions`, SessionMiddleware.validateJWT, Controller.transactionsList);

	server.get(`${PATH}/address/:id/tokens`, SessionMiddleware.validateJWT, Controller.tokens);

	server.get(`${PATH}/transaction/:id`, SessionMiddleware.validateJWT, Middleware.validateToken, Controller.getTransactionDetail);
};
