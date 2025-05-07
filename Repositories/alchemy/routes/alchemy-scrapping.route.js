const config = require("../../../Core/config");
const Controller = require("../controllers/alchemy-scrapping.controller");
const SessionMiddleware = require("../../Session/middlewares/session.middleware");
const Middleware = require("../middlewares/alchemy-scrapping.middleware");

const base = "/";

module.exports = (server) => {
	const PATH = config.basePath(base);

	server.post(`${PATH}account/balance`, Middleware.address, Controller.balance);

	server.post(
		`${PATH}account/transactions`,
		Middleware.address,
		Controller.transactions
	);

	server.get(`${PATH}transaction/:hash/:network`, Controller.tokens);

	server.get(`${PATH}tokens`, Middleware.tokens, Controller.tokens);

	server.get(`${PATH}token`, Middleware.token, Controller.token);

	server.get(
		`${PATH}fee-network`,
		Middleware.gas_tracker,
		Controller.gas_pricing
	);

	// server.post(
	// 	`${PATH}collectibles`,
	// 	Middleware.gas_tracker,
	// 	Controller.gas_tracker
	// );
};
