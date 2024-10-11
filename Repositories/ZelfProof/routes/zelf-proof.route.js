const config = require("../../../Core/config");

const Controller = require("../controllers/zelf-proof.controller");

const Middleware = require("../middlewares/zelf-proof.middleware");

const base = "/zelf-proof";

module.exports = (server) => {
	const PATH = config.basePath(base);

	server.post(`${PATH}/encrypt`, Middleware.encryptValidation, Controller.encrypt);

	server.post(`${PATH}/encrypt-qr-code`, Middleware.encryptValidation, Controller.encryptQRCode);

	server.post(`${PATH}/decrypt`, Middleware.decryptValidation, Controller.decrypt);

	server.post(`${PATH}/preview`, Middleware.previewValidation, Controller.preview);
};
