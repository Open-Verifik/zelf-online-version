const { string, validate, boolean, number, stringEnum } = require("../../../Core/JoiUtils");
const captchaService = require("../../../Core/captcha");

const schemas = {
	search: {
		zelfName: string(),
		key: string(),
		value: string(),
		os: stringEnum(["DESKTOP", "ANDROID", "IOS"]),
		captchaToken: string(),
	},
	lease: {
		zelfName: string().required(),
		faceBase64: string().required(),
		type: stringEnum(["create", "import"]).required(),
		os: stringEnum(["DESKTOP", "ANDROID", "IOS"]).required(),
		captchaToken: string().required(),
	},
	create: {
		password: string(),
		addServerPassword: boolean(),
		wordsCount: number().required(),
	},
	import: {
		password: string(),
		mnemonic: string().required(),
	},
	decrypt: {
		faceBase64: string().required(),
		password: string(),
		zelfName: string().required(),
		addServerPassword: boolean(),
		os: stringEnum(["DESKTOP", "ANDROID", "IOS"]).required(),
		captchaToken: string().required(),
	},
	preview: {
		zelfName: string().required(),
		os: stringEnum(["DESKTOP", "ANDROID", "IOS"]).required(),
		captchaToken: string().required(),
	},
};

/**
 * Get Validation
 * @param {*} request
 * @param {*} response
 * @param {*} next
 */
const getValidation = async (ctx, next) => {
	const payload = Object.assign(ctx.request.query, ctx.request.body);

	const valid = validate(schemas.search, payload);

	if (valid.error) {
		ctx.status = 409;

		ctx.body = { validationError: valid.error.message };

		return;
	}

	const { zelfName, key, value, captchaToken, os } = payload;

	if (!zelfName && (!key || !value)) {
		ctx.status = 409;

		ctx.body = { validationError: "missing zelfName or search by key|value" };

		return;
	}

	const _zelfName = zelfName || value;

	const captchaScore = captchaToken ? await captchaService.createAssessment(captchaToken, os, _zelfName.split(".zelf")[0]) : 1;

	if (captchaScore < 0.79) {
		ctx.status = 409;

		ctx.body = { captchaScore, validationError: "Captcha not acceptable" };

		return;
	}

	await next();
};

/**
 *
 * @param {*} ctx
 * @param {*} next
 */
const leaseValidation = async (ctx, next) => {
	const valid = validate(schemas.lease, ctx.request.body);

	if (valid.error) {
		ctx.status = 409;

		ctx.body = { validationError: valid.error.message };

		return;
	}

	const { type, zelfName, captchaToken, os } = ctx.request.body;

	const typeValid = validate(schemas[type], ctx.request.body);

	if (typeValid.error) {
		ctx.status = 409;
		ctx.body = { validationError: typeValid.error.message };
		return;
	}

	if (!zelfName.includes(".zelf")) {
		ctx.status = 409;
		ctx.body = { validationError: "Not a valid zelf name" };
		return;
	}

	if (zelfName.length < 13) {
		ctx.status = 409;
		ctx.body = { validationError: "ZelfName should be 8 characters or more." };
		return;
	}

	const captchaScore = await captchaService.createAssessment(captchaToken, os, zelfName.split(".zelf")[0]);

	if (captchaScore < 0.79) {
		ctx.status = 409;

		ctx.body = { captchaScore, validationError: "Captcha not acceptable" };

		return;
	}

	await next();
};

const previewValidation = async (ctx, next) => {
	const validation = validate(schemas.preview, ctx.request.body);

	if (validation.error) {
		ctx.status = 409;

		ctx.body = { validationError: validation.error.message };

		return;
	}

	const { captchaToken, os, zelfName } = ctx.request.body;

	const captchaScore = await captchaService.createAssessment(captchaToken, os, zelfName.split(".zelf")[0]);

	if (captchaScore < 0.79) {
		ctx.status = 409;

		ctx.body = { captchaScore, validationError: "Captcha not acceptable" };

		return;
	}

	await next();
};

const deleteValidation = async (ctx, next) => {
	await next();
};

/**
 * decrypt validation
 * @param {Object} ctx
 * @param {Object} next
 */
const decryptValidation = async (ctx, next) => {
	const validation = validate(schemas.decrypt, ctx.request.body);

	if (validation.error) {
		ctx.status = 409;

		ctx.body = { validationError: validation.error.message };

		return;
	}

	const { captchaToken, os, zelfName } = ctx.request.body;

	const captchaScore = await captchaService.createAssessment(captchaToken, os, zelfName.split(".zelf")[0]);

	if (captchaScore < 0.79) {
		ctx.status = 409;

		ctx.body = { captchaScore, validationError: "Captcha not acceptable" };

		return;
	}

	await next();
};

module.exports = {
	getValidation,
	leaseValidation,
	previewValidation,
	deleteValidation,
	decryptValidation,
};
