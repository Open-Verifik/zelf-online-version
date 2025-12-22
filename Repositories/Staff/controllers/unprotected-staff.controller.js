const StaffModule = require("../modules/staff.module");
const { errorHandler } = require("../../../Core/http-handler");

/**
 * Create staff account from invitation
 */
const createFromInvitation = async (ctx) => {
	try {
		const data = await StaffModule.createFromInvitation(ctx.request.body);
		ctx.body = { data };
	} catch (error) {
		const _exception = errorHandler(error, ctx);
		ctx.status = _exception.status || 500;
		ctx.body = {
			code: _exception.code,
			message: _exception.message,
		};
	}
};

/**
 * Validate invitation token
 */
const validateInvitation = async (ctx) => {
	try {
		const { token } = ctx.request.query;
		if (!token) throw new Error("400:missing_token");

		const data = await StaffModule.validateInvitation(token);
		ctx.body = data;
	} catch (error) {
		const _exception = errorHandler(error, ctx);
		ctx.status = _exception.status || 500;
		ctx.body = {
			code: _exception.code,
			message: _exception.message,
		};
	}
};

/**
 * Authenticate staff member
 */
const auth = async (ctx) => {
	try {
		const data = await StaffModule.auth(ctx.request.body);
		ctx.body = data;
	} catch (error) {
		const _exception = errorHandler(error, ctx);
		ctx.status = _exception.status || 500;
		ctx.body = {
			code: _exception.code,
			message: _exception.message,
		};
	}
};

/**
 * Get Passkey Metadata
 */
const getPasskey = async (ctx) => {
	try {
		const { identifier } = ctx.request.query;

		if (!identifier) throw new Error("400:missing_identifier");

		const data = await StaffModule.getPasskey(identifier);

		ctx.body = { data };
	} catch (error) {
		const _exception = errorHandler(error, ctx);
		ctx.status = _exception.status || 500;
		ctx.body = {
			code: _exception.code,
			message: _exception.message,
		};
	}
};

module.exports = {
	createFromInvitation,
	validateInvitation,
	auth,
	getPasskey,
};
