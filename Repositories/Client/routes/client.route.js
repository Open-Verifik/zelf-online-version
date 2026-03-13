const config = require("../../../Core/config");

const Controller = require("../controllers/client.controller");
const Middleware = require("../middlewares/client.middleware");
const base = "/clients";

module.exports = (server) => {
	const PATH = config.basePath(base);

	// Routes
	server.put(`${PATH}/sync`, Middleware.updateValidation, Controller.update);
	server.put(`${PATH}/sync/password`, Middleware.updatePasswordValidation, Controller.updatePassword);
	server.del(`${PATH}`, Middleware.destroyValidation, Controller.destroy);
};
