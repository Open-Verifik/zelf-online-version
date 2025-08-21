const config = require("../../../Core/config");

const Controller = require("../controllers/ar-io-arns.controller");
const Middleware = require("../middlewares/ar-io-arns.middleware");

const base = "/ar-io-arns";

module.exports = (server) => {
	const PATH = config.basePath(base);

	server.get(`${PATH}/:zelfName`, Middleware.showValidation, Controller.show);

	server.post(`${PATH}/:zelfName`, Middleware.createValidation, Controller.create);
};
