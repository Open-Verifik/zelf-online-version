const config = require("../../../Core/config");
const Controller = require("../controllers/toncoin-scrapping.controller");
const SessionMiddleware = require("../../Session/middlewares/session.middleware");
const Middleware = require("../middlewares/toncoin-scrapping.middleware");

const base = "/tonicoin";

module.exports = (server) => {
	const PATH = config.basePath(base);

	server.get(
		`${PATH}/address/:id`,
		SessionMiddleware.validateJWT,
		Controller.balance
	);

	server.get(
		`${PATH}/address/:id/transactions`,
		SessionMiddleware.validateJWT,
		Controller.transactionsList
	);

	server.get(
		`${PATH}/transaction/:id`,
		SessionMiddleware.validateJWT,
		Middleware.validateToken,
		Controller.getTransactionDetail
	);
};
