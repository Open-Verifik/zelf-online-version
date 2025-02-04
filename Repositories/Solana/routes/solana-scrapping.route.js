const config = require("../../../Core/config");
const Controller = require("../controllers/solana-scrapping.controller");

const Middleware = require("../middlewares/solana-scrapping.middleware");

const base = "/solana";

module.exports = (server) => {
	const PATH = config.basePath(base);

	server.get(`${PATH}/address/:id`, Controller.getAddress);

	server.get(
		`${PATH}/token/:id`,
		Middleware.validateToken,
		Controller.getToken
	);

	server.get(
		`${PATH}/transactions/:id`,
		Middleware.validateAddressTransactions,
		Controller.transactionsList
	);

	server.get(
		`${PATH}/transaction/:id`,
		Middleware.validateAddressTransactions,
		Controller.transactionsList
	);

	server.get(
		`${PATH}/transfers/:id`,
		Middleware.validateAddressTransactions,
		Controller.transfers
	);

	server.get(
		`${PATH}/transfer/:id`,
		Middleware.validateAddressTransactions,
		Controller.transfer
	);
};
