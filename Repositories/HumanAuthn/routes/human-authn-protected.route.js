const config = require("../../../Core/config");
const Controller = require("../controllers/human-authn-protected.controller");

const base = "/human-authn";

module.exports = (server) => {
	const PATH = config.basePath(base);

	server.get(`${PATH}/onboarding-progress`, Controller.onboardingProgress);
};
