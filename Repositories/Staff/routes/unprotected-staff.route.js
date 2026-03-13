const config = require("../../../Core/config");
const Controller = require("../controllers/unprotected-staff.controller");
const Middleware = require("../middlewares/staff.middleware");

const base = "/staff";

module.exports = (server) => {
	const PATH = config.basePath(base);

	// Routes
	server.get(`${PATH}/validate-invite`, Controller.validateInvitation);
	server.post(`${PATH}/accept-invite`, Middleware.createFromInvitationValidation, Controller.createFromInvitation);
	server.post(`${PATH}/auth`, Middleware.authValidation, Controller.auth);
	server.get(`${PATH}/passkeys`, Controller.getPasskey);
};
