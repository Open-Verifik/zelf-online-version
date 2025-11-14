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

/**
 * Controller for validating X (Twitter) follow
 * Step 3: User submits screenshot showing they followed X account
 */
const validateX = async (ctx) => {
	try {
		const { email, tagName, domain, screenshot, xUsername } = ctx.state;

		const authUser = ctx.state.user;

		const data = await Module.validateX(email, tagName, domain, screenshot, xUsername, authUser);

		ctx.body = { data };
	} catch (error) {
		const _exception = errorHandler(error, ctx);

		ctx.status = _exception.status;

		ctx.body = { message: _exception.message, code: _exception.code };
	}
};

/**
 * Controller for validating LinkedIn follow
 * Step 4: User submits screenshot showing they followed LinkedIn account
 */
const validateLinkedIn = async (ctx) => {
	try {
		const { email, tagName, domain, screenshot, linkedInUsername } = ctx.state;
		const authUser = ctx.state.user;

		const data = await Module.validateLinkedIn(email, tagName, domain, screenshot, linkedInUsername, authUser);

		ctx.body = { data };
	} catch (error) {
		const _exception = errorHandler(error, ctx);

		ctx.status = _exception.status;

		ctx.body = { message: _exception.message, code: _exception.code };
	}
};

/**
 * Controller for getting social campaign record
 * Retrieves record by tagName and domain for authenticated user
 */
const getRecord = async (ctx) => {
	try {
		const { tagName, domain } = ctx.state;

		const authUser = ctx.state.user;

		const data = await Module.getRecord(tagName, domain, authUser);

		ctx.body = { data };
	} catch (error) {
		const _exception = errorHandler(error, ctx);

		ctx.status = _exception.status;

		ctx.body = { message: _exception.message, code: _exception.code };
	}
};

/**
 * Controller for getting reward by tagName and domain
 * Retrieves reward by tagName and domain for authenticated user
 */
const getReward = async (ctx) => {
	try {
		const { tagName, domain } = ctx.state;

		const authUser = ctx.state.user;

		const data = await Module.getReward(tagName, domain, authUser);

		ctx.body = { data };
	} catch (error) {
		const _exception = errorHandler(error, ctx);

		ctx.status = _exception.status;

		ctx.body = { message: _exception.message, code: _exception.code };
	}
};

module.exports = {
	provideEmail,
	validateOTP,
	validateX,
	validateLinkedIn,
	getRecord,
	getReward,
};
