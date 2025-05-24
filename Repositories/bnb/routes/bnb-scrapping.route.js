const config = require("../../../Core/config");
const Controller = require("../controllers/bnb-scrapping.controller");

const Middleware = require("../middlewares/bnb-scrapping.middleware");

const base = "/bnb";

module.exports = (server) => {
	const PATH = config.basePath(base);

	server.get(`${PATH}/address/:id`, Controller.getAddress);

	server.get(`${PATH}/:id/transactions`, Middleware.validateAddressTransactions, Controller.transactionsList);

	server.get(`${PATH}/token/:id`, Middleware.validateToken, Controller.getToken);
};
