const config = require("../../../Core/config");
const Controller = require("../controllers/purchase.controller");

const Middleware = require("../middlewares/purchase.middleware");

const base = "/checkout";

module.exports = (server) => {
	const PATH = config.basePath(base);

	server.get(
		`${PATH}/select-method`,

		Controller.tickerPrice
	);

	server.get(
		`${PATH}/clock-sync/:id`,

		Controller.clock_sync
	);
	server.get(
		`${PATH}/purchase/:id`,
		///Middleware.validateParamas,
		Controller.checkout
	);
	server.get(
		`${PATH}/pay/:id`,

		Controller.pay
	);

	server.get(
		`${PATH}/lease-confirmation-pay/:id`,

		Controller.pay
	);
};
