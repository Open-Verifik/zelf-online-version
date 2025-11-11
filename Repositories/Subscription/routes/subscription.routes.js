const Controller = require("../controllers/subscription.controller.js");

const config = require("../../../Core/config");

const base = "/subscription";

module.exports = (server) => {
	const PATH = config.basePath(base);

	server.get(`${PATH}/plans`, Controller.getAvailablePlans);
};
