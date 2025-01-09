const config = require("../../../Core/config");

const Controller = require("../controllers/zns.controller");

const Middleware = require("../middlewares/zns.middleware");

const base = "/zelf-name-service";

module.exports = (server) => {
	const PATH = config.basePath(base);

	server.get(`${PATH}/search`, Middleware.getValidation, Controller.searchZelfName);

	server.post(`${PATH}/search`, Middleware.getValidation, Controller.searchZelfName);

	server.post(`${PATH}/lease`, Middleware.leaseValidation, Controller.leaseZelfName);

	server.post(`${PATH}/preview`, Middleware.previewValidation, Controller.previewZelfName);

	server.post(`${PATH}/decrypt`, Middleware.decryptValidation, Controller.decryptZelfName);

	// server.del(`${PATH}/:id`, Middleware.deleteValidation, Controller.destroy);
};
