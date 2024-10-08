const config = require("../../../Core/config");

const Controller = require("../controllers/client.controller");
const Middleware = require("../middlewares/client.middleware");
const primaryKey = "id";
const base = "/clients";

module.exports = (server) => {
	const PATH = config.basePath(base);

	server.get(PATH, Middleware.getValidation, Controller.get);

	server.get(`${PATH}/:${primaryKey}`, Middleware.showValidation, Controller.show);

	server.post(`${PATH}`, Middleware.createValidation, Controller.create);

	server.post(`${PATH}/auth`, Middleware.authValidation, Controller.auth);

	server.del(`${PATH}/${primaryKey}`, Middleware.destroyValidation, Controller.destroy);
};
