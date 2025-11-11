const Controller = require("../controllers/zelf-key.controller.js");
const Middleware = require("../middlewares/zelf-key.middleware.js");
const config = require("../../../Core/config");

/**
 * ZelfKey Routes - Password manager API endpoints
 * @author Miguel Trevino <miguel@zelf.world>
 */
const base = "/zelf-keys";

module.exports = (server) => {
	const PATH = config.basePath(base);

	server.post(`${PATH}/store/password`, Middleware.storePasswordValidation, Controller.storePassword);
	server.post(`${PATH}/store/zotp`, Middleware.storeZOTPValidation, Controller.storeZOTP);
	server.post(`${PATH}/store/notes`, Middleware.storeNotesValidation, Controller.storeNotes);
	server.post(`${PATH}/store/credit-card`, Middleware.storeCreditCardValidation, Controller.storeCreditCard);

	server.get(`${PATH}/list`, Middleware.listValidation, Controller.listData);
	server.post(`${PATH}/retrieve`, Middleware.retrieveValidation, Controller.retrieveData);
	server.post(`${PATH}/preview`, Middleware.previewValidation, Controller.previewData);

	server.put(`${PATH}/delete/:id`, Middleware.deleteZelfKeyValidation, Controller.deleteZelfKey);
};
