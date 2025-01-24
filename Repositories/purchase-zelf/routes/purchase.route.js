const config = require("../../../Core/config");
const Controller = require("../controllers/purchase.controller");

const Middleware = require("../middlewares/purchase.middleware");

const base = "/checkout";

module.exports = (server) => {
	const PATH = config.basePath(base);

	server.get(
		`${PATH}/setp`,

		Controller.setp
	);

	server.get(
		`${PATH}/select-method`,

		Controller.select_method
	);

	server.get(
		`${PATH}/select-method-coibase/:id`,
		Middleware.validateParamas,
		Controller.select_method_coibase
	);

	server.get(
		`${PATH}/clock-sync/:id`,

		Controller.clock_sync
	);
	server.get(
		`${PATH}/purchase/:zelfName`,

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
