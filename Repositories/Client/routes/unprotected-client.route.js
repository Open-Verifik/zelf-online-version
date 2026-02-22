const config = require("../../../Core/config");

const Controller = require("../controllers/unprotected-client.controller");
const Middleware = require("../middlewares/client.middleware");

const base = "/clients";

module.exports = (server) => {
	const PATH = config.basePath(base);

	// Routes
	server.get(`${PATH}`, Controller.verifyClient);
	server.post(`${PATH}`, Middleware.createValidation, Controller.create);
	server.post(`${PATH}/auth`, Middleware.authValidation, Controller.auth);
};





