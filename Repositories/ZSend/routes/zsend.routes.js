const config = require("../../../Core/config");
const Controller = require("../controllers/zsend.controller");
const Middleware = require("../middlewares/zsend.middleware");

const base = "/zsend";

/**
 * Directory reads a sender needs before wrapping a key. Registered in
 * `Routes/protected-repositories.js`, matching the JWT model of `/api/tags`.
 */
module.exports = (server) => {
	const PATH = config.basePath(base);

	server.get(`${PATH}/purpose-id`, Middleware.purposeIdValidation, Controller.purposeId);
	server.get(`${PATH}/certificates`, Middleware.lookupCertificateValidation, Controller.lookupCertificate);
};
