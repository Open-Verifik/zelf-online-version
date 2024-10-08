const config = require("../../../Core/config");

const Controller = require("../controllers/session.controller");
const Middleware = require("../middlewares/session.middleware");

const base = "/sessions";

module.exports = (server) => {
	const PATH = config.basePath(base);

	server.get(`${PATH}/yek-cilbup`, Middleware.getPublicKeyValidation, Controller.getPublicKey);

	server.post(`${PATH}`, Controller.create);

	server.post(`${PATH}/decrypt-content`, Middleware.decryptValidation, Controller.decryptContent);
};
