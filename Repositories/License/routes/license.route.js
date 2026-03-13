const Controller = require("../controllers/license.controller");
const Middleware = require("../middlewares/license.middleware");
const config = require("../../../Core/config");
const base = "/license";

module.exports = (server) => {
	const PATH = config.basePath(base);
	// Route definitions
	server.get(`${PATH}`, Middleware.searchValidation, Controller.searchLicense);
	server.get(`${PATH}/my-license`, Middleware.getMyLicenseValidation, Controller.getMyLicense);
	server.post(`${PATH}`, Middleware.createValidation, Controller.createOrUpdateLicense);
	server.delete(`${PATH}`, Middleware.deleteValidation, Controller.deleteLicense);
};





