const config = require("../../../Core/config");
const Controller = require("../controllers/bitcoin-scrapping.controller");

const Middleware = require("../middlewares/bitcoin-scrapping.middleware");

const base = "/bitcoin";

module.exports = (server) => {
	const PATH = config.basePath(base);

	server.get(
		`${PATH}/address/:id`,
		//Middleware.validateAddress,
		Controller.balance
	);

	server.get(
		`${PATH}/transactions/:id`,
		Middleware.validateAddressTransactions,
		Controller.transactionsList
	);

	server.get(
		`${PATH}/transaction/:id`,
		Middleware.validateToken,
		Controller.getTransactionDetail
	);
};