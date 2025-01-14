const config = require("../../../Core/config");
const Controller = require("../controllers/purchase.controller");

const Middleware = require("../middlewares/purchase.middleware");

const base = "/checkout";

module.exports = (server) => {
	const PATH = config.basePath(base);

	server.get(
		`${PATH}/purchase/:id`,
		///Middleware.validateParamas,
		Controller.checkout
	);

	server.get(
		`${PATH}/getTickerPrice`,

		Controller.tickerPrice
	);
};
