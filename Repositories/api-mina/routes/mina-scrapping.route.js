const config = require("../../../Core/config");
const Controller = require("../controllers/mina-scrapping.controller");

const Middleware = require("../middlewares/mina-scrapping.middleware");

const base = "/mina";

module.exports = (server) => {
	const PATH = config.basePath(base);

	server.get(`${PATH}/address/:id`, Controller.balance);

	server.get(`${PATH}/transactions/:id`, Middleware.validateAddressTransactions, Controller.transactionsList);

	server.get(`${PATH}/token/:id`, Middleware.validateToken, Controller.getToken);
};
