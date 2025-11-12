const { string, validate } = require("../../../Core/JoiUtils");

const schemas = {
	provideEmail: {
		email: string().email().required(),
		tagName: string().required(),
		domain: string().required(),
	},
	validateOTP: {
		tagName: string().required(),
		domain: string().required(),
		email: string().email().required(),
		otp: string().required().length(6),
	},
};

/**
 * Middleware to validate provide email request
 */
const provideEmailValidation = async (ctx, next) => {
	try {
		const { email, tagName, domain } = ctx.request.body;

		const valid = validate(schemas.provideEmail, {
			email,
			tagName,
			domain,
		});

		if (valid.error) {
			ctx.status = 400;
			ctx.body = { error: valid.error.message };
			return;
		}

		// Normalize email to lowercase
		ctx.state.email = email.toLowerCase().trim();
		ctx.state.tagName = tagName.toLowerCase().trim();
		ctx.state.domain = domain.toLowerCase().trim();

		await next();
	} catch (error) {
		ctx.status = 400;
		ctx.body = { error: error.message };
	}
};

/**
 * Middleware to validate OTP request
 */
const validateOTPValidation = async (ctx, next) => {
	try {
		const { email, otp, tagName, domain } = ctx.request.body;

		const valid = validate(schemas.validateOTP, {
			email,
			otp,
			tagName,
			domain,
		});

		if (valid.error) {
			ctx.status = 400;
			ctx.body = { error: valid.error.message };
			return;
		}

		// Normalize email to lowercase
		ctx.state.email = email.toLowerCase().trim();
		ctx.state.tagName = tagName.toLowerCase().trim();
		ctx.state.domain = domain.toLowerCase().trim();
		ctx.state.otp = otp.trim();

		await next();
	} catch (error) {
		ctx.status = 400;
		ctx.body = { error: error.message };
	}
};

module.exports = {
	provideEmailValidation,
	validateOTPValidation,
};
