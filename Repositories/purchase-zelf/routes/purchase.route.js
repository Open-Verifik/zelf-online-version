const config = require("../../../Core/config");
const Controller = require("../controllers/purchase.controller");

const Middleware = require("../middlewares/purchase.middleware");

const base = "/payment";

module.exports = (server) => {
	const PATH = config.basePath(base);

	server.post(
		`${PATH}/search_zelf_lease`,

		Controller.search_zelf_lease
	);

	server.post(
		`${PATH}/select-method`,

		Controller.select_method
	);

	server.post(
		`${PATH}/pay/:zelfName`,

		Controller.pay
	);

	server.post(
		`${PATH}/lease-confirmation-pay/:id`,

		Controller.pay
	);
};
