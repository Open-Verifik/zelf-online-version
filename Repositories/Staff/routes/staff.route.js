const config = require("../../../Core/config");
const Controller = require("../controllers/staff.controller");
const Middleware = require("../middlewares/staff.middleware");

const base = "/staff";

module.exports = (server) => {
	const PATH = config.basePath(base);

	server.get(`${PATH}`, Controller.get);

	server.post(`${PATH}/invite`, Middleware.inviteValidation, Controller.generateInvitation);

	server.put(`${PATH}/role`, Middleware.updateRoleValidation, Controller.updateRole);

	server.del(`${PATH}`, Middleware.removeValidation, Controller.remove);

	server.post(`${PATH}/passkeys`, Middleware.savePasskeyValidation, Controller.savePasskey);

	server.get(`${PATH}/passkeys/ipfs-details`, Controller.getPasskeyIpfsDetails);

	server.del(`${PATH}/passkeys`, Controller.deletePasskey);

	server.put(`${PATH}`, Middleware.updateProfileValidation, Controller.updateProfile);
};
