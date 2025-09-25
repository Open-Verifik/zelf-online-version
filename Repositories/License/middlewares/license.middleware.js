const { string, validate, stringEnum } = require("../../../Core/JoiUtils");
const config = require("../../../Core/config");

const schemas = {
	search: {
		domain: string().pattern(/^[a-zA-Z0-9][a-zA-Z0-9-]*[a-zA-Z0-9]$/),
	},
	getMyLicense: {
		// No specific validation needed for getting user's own licenses
	},
	create: {
		domain: string()
			.pattern(/^[a-zA-Z0-9][a-zA-Z0-9-]*[a-zA-Z0-9]$/)
			.required(),
		faceBase64: string().base64().required(),
		masterPassword: string().optional().allow(""),
		os: stringEnum(["DESKTOP", "ANDROID", "IOS"]).optional(),
	},
	delete: {
		ipfsHash: string()
			.pattern(/^[a-zA-Z0-9]+$/)
			.required(),
	},
};

/**
 * Search License Validation
 * @param {*} ctx
 * @param {*} next
 */
const searchValidation = async (ctx, next) => {
	const payload = Object.assign(ctx.request.query, ctx.request.body);

	const { domain } = payload;

	const valid = validate(schemas.search, {
		domain,
	});

	if (valid.error) {
		ctx.status = 409;
		ctx.body = { validationError: valid.error.message };
		return;
	}

	await next();
};

/**
 * Get My License Validation
 * @param {*} ctx
 * @param {*} next
 */
const getMyLicenseValidation = async (ctx, next) => {
	if (!ctx.state.user.email) {
		ctx.status = 409;
		ctx.body = { validationError: "User not authenticated" };
		return;
	}

	const payload = Object.assign(ctx.request.query, ctx.request.body);

	const valid = validate(schemas.getMyLicense, payload);

	if (valid.error) {
		ctx.status = 409;
		ctx.body = { validationError: valid.error.message };
		return;
	}

	await next();
};

/**
 * Create License Validation
 * @param {*} ctx
 * @param {*} next
 */
const createValidation = async (ctx, next) => {
	const payload = Object.assign(ctx.request.query, ctx.request.body);

	const { domain, faceBase64, masterPassword, os } = payload;

	const valid = validate(schemas.create, {
		domain,
		faceBase64,
		masterPassword,
		os,
	});

	if (valid.error) {
		ctx.status = 409;
		ctx.body = { validationError: valid.error.message };
		return;
	}

	await next();
};

/**
 * Delete License Validation
 * @param {*} ctx
 * @param {*} next
 */
const deleteValidation = async (ctx, next) => {
	const payload = Object.assign(ctx.request.query, ctx.request.body, ctx.request.params);

	const { ipfsHash } = payload;

	const valid = validate(schemas.delete, {
		ipfsHash,
	});

	if (valid.error) {
		ctx.status = 409;
		ctx.body = { validationError: valid.error.message };
		return;
	}

	await next();
};

module.exports = {
	searchValidation,
	getMyLicenseValidation,
	createValidation,
	deleteValidation,
	// Legacy names for backward compatibility
	validateSearchLicense: searchValidation,
	validateCreateLicense: createValidation,
	validateDeleteLicense: deleteValidation,
};
