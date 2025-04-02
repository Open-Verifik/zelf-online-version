const config = require("../../../Core/config");
const Controller = require("../controllers/polygon-scrapping.controller");

const Middleware = require("../middlewares/polygon-scrapping.middleware");

const base = "/polygon";

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
		Controller.transactionStatus
	);
	server.get(
		`${PATH}/gas-tracker`,
		//SessionMiddleware.validateJWT,
		Controller.gasTracker
	);
};
