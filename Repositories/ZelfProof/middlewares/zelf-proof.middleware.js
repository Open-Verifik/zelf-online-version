const { string, validate, boolean, number, jsonObjectWithMinKeys, stringEnum } = require("../../../Core/JoiUtils");
const { jwtValidation } = require("./jwt-validation.middleware");

/**
 *   "face_base_64": "face_base_64",
  "liveness_tolerance": "REGULAR",
  "os": "DESKTOP",
  "password": "(optional) password",
  "senseprint_base_64": "senseprint_base_64",
  "verifiers_auth_key": "(optional) verifiers_auth_key"
 */

const schemas = {
	encrypt: {
		livenessDetectionPriorCreation: boolean(),
		publicData: jsonObjectWithMinKeys(),
		faceBase64: string().required(),
		livenessLevel: string().required(),
		metadata: jsonObjectWithMinKeys().required(),
		os: stringEnum(["DESKTOP", "ANDROID", "IOS"]).required(),
		password: string(),
		identifier: string().required(),
		referenceFaceBase64: string(),
		requireLiveness: boolean(),
		tolerance: stringEnum(["REGULAR", "SOFT", "HARDENED"]),
		verifierKey: string(),
	},
	decrypt: {
		faceBase64: string().required(),
		livenessLevel: string(),
		os: stringEnum(["DESKTOP", "ANDROID", "IOS"]).required(),
		password: string(),
		zelfProof: string().required(),
		verifierKey: string(),
	},
	preview: {
		zelfProof: string().required(),
		verifierKey: string(),
	},
};

/**
 * Create Validation
 * @param {*} request
 * @param {*} response
 * @param {*} next
 */
const encryptValidation = async (ctx, next) => {
	const authUser = ctx.state.user;

	if (!authUser.superAdminId && !authUser.clientId) {
		ctx.status = 403;

		ctx.body = { validationError: "Access Forbidden" };

		return;
	}

	const valid = validate(schemas.encrypt, ctx.request.body);

	if (valid.error) {
		console.log({ valid });
		ctx.status = 409;

		ctx.body = { validationError: valid.error.message };

		return;
	}

	await next();
};

/**
 * Create Validation
 * @param {*} request
 * @param {*} response
 * @param {*} next
 */
const decryptValidation = async (ctx, next) => {
	const authUser = ctx.state.user;

	if (!authUser.superAdminId && !authUser.clientId) {
		ctx.status = 403;

		ctx.body = { validationError: "Access Forbidden" };

		return;
	}

	const valid = validate(schemas.decrypt, ctx.request.body);

	if (valid.error) {
		ctx.status = 409;

		ctx.body = { validationError: valid.error.message };

		return;
	}

	await next();
};

/**
 * Create Validation
 * @param {*} request
 * @param {*} response
 * @param {*} next
 */
const previewValidation = async (ctx, next) => {
	const authUser = ctx.state.user;

	if (!authUser.superAdminId && !authUser.clientId) {
		ctx.status = 403;

		ctx.body = { validationError: "Access Forbidden" };

		return;
	}

	const valid = validate(schemas.preview, ctx.request.body);

	if (valid.error) {
		ctx.status = 409;

		ctx.body = { validationError: valid.error.message };

		return;
	}

	await next();
};

module.exports = {
	encryptValidation,
	decryptValidation,
	previewValidation,
	jwtValidation,
};
