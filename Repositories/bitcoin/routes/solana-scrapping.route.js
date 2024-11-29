const config = require("../../../Core/config");
const Controller = require("../controllers/solana-scrapping.controller");

const Middleware = require("../middlewares/solana-scrapping.middleware");

const base = "/solana";

module.exports = (server) => {
	const PATH = config.basePath(base);

	server.get(
		`${PATH}/balance/:id`,
		//Middleware.validateAddress,
		Controller.balance
	);

	server.get(
		`${PATH}/transactions/:id`,
		Middleware.validateAddressTransactions,
		Controller.transactionsList
	);

	server.get(
		`${PATH}/token/:id`,
		Middleware.validateToken,
		Controller.getToken
	);
};
