const { string, validate, boolean, number, jsonObjectWithMinKeys, stringEnum, stringKeyValueObject } = require("../../../Core/JoiUtils");
const { jwtValidation } = require("./jwt-validation.middleware");

/**
 * HumanAuthn raw encrypt/decrypt/preview body (ZelfEncrypt v4).
 *
 * encrypt required: faceBase64, metadata, identifier, livenessLevel, os
 * encrypt optional: publicData, password, requireLiveness, tolerance, verifierKey, livenessDetectionPriorCreation, referenceFaceBase64
 * decrypt required: faceBase64, os, zelfProof
 * decrypt optional: password, verifierKey, livenessLevel
 * preview required: zelfProof
 * preview optional: verifierKey
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
 * Validate POST /api/human-authn/encrypt and /encrypt-qr-code body.
 * @param {import("koa").Context} ctx
 * @param {Function} next
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
 * Validate POST /api/human-authn/decrypt body.
 * @param {import("koa").Context} ctx
 * @param {Function} next
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
 * Validate POST /api/human-authn/preview body.
 * @param {import("koa").Context} ctx
 * @param {Function} next
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

/**
 * Validate POST /api/human-authn/upgrade body.
 * @param {import("koa").Context} ctx
 * @param {Function} next
 */
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
