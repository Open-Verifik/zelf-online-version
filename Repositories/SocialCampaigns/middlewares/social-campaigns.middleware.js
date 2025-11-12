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
	validateX: {
		tagName: string().required(),
		domain: string().required(),
		email: string().email().required(),
		screenshot: string().required(), // Base64 encoded image
		xUsername: string().required(), // X (Twitter) username that user claims to follow
	},
	validateLinkedIn: {
		tagName: string().required(),
		domain: string().required(),
		email: string().email().required(),
		screenshot: string().required(), // Base64 encoded image
		linkedInUsername: string().required(), // LinkedIn username or profile link
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

/**
 * Middleware to validate X (Twitter) follow screenshot
 */
const validateXValidation = async (ctx, next) => {
	try {
		const { email, tagName, domain, screenshot, xUsername } = ctx.request.body;

		const valid = validate(schemas.validateX, {
			email,
			tagName,
			domain,
			screenshot,
			xUsername,
		});

		if (valid.error) {
			ctx.status = 400;
			ctx.body = { error: valid.error.message };
			return;
		}

		// Validate screenshot is base64 image (with or without data URL prefix)
		const base64Pattern = /^data:image\/(jpeg|jpg|png|webp);base64,/;
		const plainBase64Pattern = /^[A-Za-z0-9+/=]+$/;

		if (!base64Pattern.test(screenshot) && !plainBase64Pattern.test(screenshot)) {
			ctx.status = 400;
			ctx.body = { error: "Screenshot must be a valid base64 encoded image (jpeg, jpg, png, or webp)" };
			return;
		}

		// Normalize values
		ctx.state.email = email.toLowerCase().trim();
		ctx.state.tagName = tagName.toLowerCase().trim();
		ctx.state.domain = domain.toLowerCase().trim();
		ctx.state.screenshot = screenshot;
		ctx.state.xUsername = xUsername.trim();

		await next();
	} catch (error) {
		ctx.status = 400;
		ctx.body = { error: error.message };
	}
};

/**
 * Middleware to validate LinkedIn follow screenshot
 */
const validateLinkedInValidation = async (ctx, next) => {
	try {
		const { email, tagName, domain, screenshot, linkedInUsername } = ctx.request.body;

		const valid = validate(schemas.validateLinkedIn, {
			email,
			tagName,
			domain,
			screenshot,
			linkedInUsername,
		});

		if (valid.error) {
			ctx.status = 400;
			ctx.body = { error: valid.error.message };
			return;
		}

		// Validate screenshot is base64 image (with or without data URL prefix)
		const base64Pattern = /^data:image\/(jpeg|jpg|png|webp);base64,/;
		const plainBase64Pattern = /^[A-Za-z0-9+/=]+$/;

		if (!base64Pattern.test(screenshot) && !plainBase64Pattern.test(screenshot)) {
			ctx.status = 400;
			ctx.body = { error: "Screenshot must be a valid base64 encoded image (jpeg, jpg, png, or webp)" };
			return;
		}

		// Normalize values
		ctx.state.email = email.toLowerCase().trim();
		ctx.state.tagName = tagName.toLowerCase().trim();
		ctx.state.domain = domain.toLowerCase().trim();
		ctx.state.screenshot = screenshot;
		ctx.state.linkedInUsername = linkedInUsername.trim();

		await next();
	} catch (error) {
		ctx.status = 400;
		ctx.body = { error: error.message };
	}
};

module.exports = {
	provideEmailValidation,
	validateOTPValidation,
	validateXValidation,
	validateLinkedInValidation,
};
