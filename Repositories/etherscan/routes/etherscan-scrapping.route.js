const config = require("../../../Core/config");
const Controller = require("../controllers/etherscan-scrapping.controller");

const Middleware = require("../middlewares/etherscan.middleware");

const base = "/ethereum";

module.exports = (server) => {
	const PATH = config.basePath(base);

	server.get(`${PATH}/address`, Middleware.validateAddress, Controller.address);

	server.get(
		`${PATH}/transactions`,
		Middleware.validateAddressTransactions,
		Controller.transactionsList
	);

	server.get(`${PATH}/transaction/:id`, Controller.transactionStatus);

	server.get(`${PATH}/gas-tracker`, Controller.gasTracker);

	server.post(`${PATH}/gas-tracker`, Controller.gasTracker);
};
