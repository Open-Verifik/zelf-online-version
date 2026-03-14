const config = require("../../../Core/config");
const Controller = require("../controllers/stellar-scrapping.controller");
const Middleware = require("../middlewares/stellar-scrapping.middleware");

const base = "/stellar";

module.exports = (server) => {
	const PATH = config.basePath(base);

	server.get(`${PATH}/address/:id`, Middleware.validateAddress, Controller.getAddress);

	server.get(
		`${PATH}/address/:id/transactions`,
		Middleware.validateAddressTransactions,
		Controller.transactionsList
	);

	server.get(
		`${PATH}/transaction/:id`,
		Middleware.validateTransactionHash,
		Controller.getTransactionDetail
	);
};
