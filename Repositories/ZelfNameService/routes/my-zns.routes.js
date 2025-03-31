const config = require("../../../Core/config");

const Controller = require("../controllers/my-zns.controller");

const Middleware = require("../middlewares/my-zns.middleware");

const base = "/my-zelf-name";

module.exports = (server) => {
	const PATH = config.basePath(base);

	// transfer zelf name
	server.post(`${PATH}/transfer`, Middleware.transferValidation, Controller.transferZelfName);

	server.get(`${PATH}/how-to-renew`, Middleware.howToRenewValidation, Controller.howToRenewZelfName);

	// renew zelf name
	server.post(`${PATH}/renew`, Middleware.renewValidation, Controller.renewZelfName);
};
