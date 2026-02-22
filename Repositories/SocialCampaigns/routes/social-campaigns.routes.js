const config = require("../../../Core/config");

const Controller = require("../controllers/social-campaigns.controller");
const Middleware = require("../middlewares/social-campaigns.middleware");

const base = "/social-campaigns";

module.exports = (server) => {
	const PATH = config.basePath(base);

	// Step 1: Provide social email
	server.post(`${PATH}/provide-email`, Middleware.provideEmailValidation, Controller.provideEmail);

	// Step 2: Validate social email with OTP
	server.post(`${PATH}/validate-email`, Middleware.validateOTPValidation, Controller.validateOTP);

	// Step 3: Validate X (Twitter) follow
	server.post(`${PATH}/validate-x`, Middleware.validateXValidation, Controller.validateX);

	// Step 4: Validate LinkedIn follow
	server.post(`${PATH}/validate-linkedin`, Middleware.validateLinkedInValidation, Controller.validateLinkedIn);

	// Get record by tagName and domain
	server.get(`${PATH}/record`, Middleware.getRecordValidation, Controller.getRecord);

	// get reward by tagName and domain
	server.post(`${PATH}/reward`, Middleware.getRewardValidation, Controller.getReward);
};



