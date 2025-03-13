const config = require("../../../Core/config");
const Controller = require("../controllers/avalanche-scrapping.controller");

const Middleware = require("../middlewares/avalanche-scrapping.middleware");

const base = "/avalanche";

module.exports = (server) => {
	const PATH = config.basePath(base);

	server.get(
		`${PATH}/address/:id`,
		//Middleware.validateAddress,
		Controller.balance
	);

	server.get(
		`${PATH}/transactions/:id`,
		//Middleware.validateAddressTransactions,
		Controller.transactionsList
	);
	server.get(
		`${PATH}/tokens/:id`,
		//Middleware.validateAddressTransactions,
		Controller.tokens
	);
	server.get(
		`${PATH}/transaction/:id`,
		Middleware.validateToken,
		Controller.getTransactionDetail
	);
};
