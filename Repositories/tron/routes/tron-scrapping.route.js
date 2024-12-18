const config = require("../../../Core/config");
const Controller = require("../controllers/tron-scrapping.controller");

const Middleware = require("../middlewares/tron-scrapping.middleware");

const base = "/tron";

module.exports = (server) => {
	const PATH = config.basePath(base);

	server.get(`${PATH}/address/:id`, Controller.balance);

	server.get(`${PATH}/transactions/:id`, Middleware.validateAddressTransactions, Controller.transactionsList);

	server.get(`${PATH}/token/:id`, Middleware.validateToken, Controller.getToken);
};
