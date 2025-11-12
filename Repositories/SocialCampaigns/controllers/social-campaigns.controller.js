const Module = require("../modules/social-campaigns.module");
const { errorHandler } = require("../../../Core/http-handler");

/**
 * Controller for providing social email
 * Step 1: User provides email, receives OTP
 */
const provideEmail = async (ctx) => {
	try {
		const { email, tagName, domain } = ctx.state;

		const authUser = ctx.state.user;

		const data = await Module.provideEmail(email, tagName, domain, authUser);

		ctx.body = { data };
	} catch (error) {
		const _exception = errorHandler(error, ctx);

		ctx.status = _exception.status;

		ctx.body = { message: _exception.message, code: _exception.code };
	}
};

/**
 * Controller for validating OTP
 * Step 2: User validates email with OTP code
 */
const validateOTP = async (ctx) => {
	try {
		const { email, otp, tagName, domain } = ctx.state;
		const authUser = ctx.state.user;

		const data = await Module.validateOTP(email, otp, tagName, domain, authUser);

		ctx.body = data;
	} catch (error) {
		const _exception = errorHandler(error, ctx);

		ctx.status = _exception.status;

		ctx.body = { message: _exception.message, code: _exception.code };
	}
};

module.exports = {
	provideEmail,
	validateOTP,
};
