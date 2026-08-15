const { string, validate, boolean, number, jsonObjectWithMinKeys, stringEnum, stringKeyValueObject } = require("../../../Core/JoiUtils");
const { jwtValidation } = require("./jwt-validation.middleware");

/**
 * `/api/zelf-proof` Koa body (camelCase). Legacy `/zelf` stack.
 *
 * encrypt: faceBase64, metadata, identifier, livenessLevel, os (required);
 *   publicData, password, requireLiveness, tolerance, verifierKey, livenessDetectionPriorCreation, referenceFaceBase64 (optional)
 * decrypt: faceBase64, os, zelfProof (required); password, verifierKey, livenessLevel (optional)
 * preview: zelfProof (required); verifierKey (optional)
 */

const schemas = {
	encrypt: {
		livenessDetectionPriorCreation: boolean(),
		publicData: stringKeyValueObject(),
		faceBase64: string().required(),
		livenessLevel: stringEnum(["REGULAR", "SOFT", "HARDENED"]).required(),
		metadata: stringKeyValueObject().required(),
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
	upgrade: {
		faceBase64: string().required(),
		os: stringEnum(["DESKTOP", "ANDROID", "IOS"]).required(),
		password: string(),
		requireLiveness: boolean(),
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
	const valid = validate(schemas.encrypt, ctx.request.body);

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
const decryptValidation = async (ctx, next) => {
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
	const valid = validate(schemas.preview, ctx.request.body);

	if (valid.error) {
		ctx.status = 409;

		ctx.body = { validationError: valid.error.message };

		return;
	}

	await next();
};

const upgradeValidation = async (ctx, next) => {
	const valid = validate(schemas.upgrade, ctx.request.body);

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
	upgradeValidation,
	jwtValidation,
};
