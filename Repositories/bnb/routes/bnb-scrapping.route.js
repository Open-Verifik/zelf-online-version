const config = require("../../../Core/config");
const Controller = require("../controllers/bnb-scrapping.controller");

const Middleware = require("../middlewares/bnb-scrapping.middleware");

const base = "/bnb";

module.exports = (server) => {
	const PATH = config.basePath(base);

	server.get(`${PATH}/address/:id`, Controller.address);

	server.get(`${PATH}/address/:id/transactions`, Middleware.validateAddressTransactions, Controller.transactionsList);

	server.get(`${PATH}/gas-tracker`, Middleware.validateToken, Controller.gasTracker);

	server.get(`${PATH}/transaction/:id`, Middleware.validateToken, Controller.transactionStatus);
};
