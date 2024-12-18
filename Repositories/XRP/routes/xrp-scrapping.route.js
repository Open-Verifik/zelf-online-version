const config = require("../../../Core/config");
const Controller = require("../controllers/xrp-scrapping.controller");

const Middleware = require("../middlewares/xrp-scrapping.middleware");

const base = "/xrp";

module.exports = (server) => {
	const PATH = config.basePath(base);

	server.get(`${PATH}/address/:id`, Controller.getAddress);

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
