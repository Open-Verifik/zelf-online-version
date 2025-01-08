const { string, validate, boolean, number, stringEnum } = require("../../../Core/JoiUtils");

const schemas = {
	lease: {
		type: stringEnum(["create", "import"]).required(),
		// years: number().required(),
	},
	create: {
		zelfName: string().required(),
		faceBase64: string().required(),
		password: string(),
		addServerPassword: boolean(),
		wordsCount: number().required(),
	},
	import: {
		zelfName: string().required(),
		faceBase64: string().required(),
		password: string(),
		mnemonic: string().required(),
	},
	decrypt: {
		faceBase64: string().required(),
		password: string(),
		zelfName: string().required(),
		addServerPassword: boolean(),
	},
	preview: {
		zelfName: string().required(),
	},
};

/**
 * Get Validation
 * @param {*} request
 * @param {*} response
 * @param {*} next
 */
const getValidation = async (ctx, next) => {
	const { zelfName, key, value } = ctx.request.query;

	if (!zelfName && (!key || !value)) {
		ctx.status = 409;

		ctx.body = { validationError: "missing zelfName or search by key|value" };

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

	const { type, zelfName } = ctx.request.body;

	const typeValid = validate(schemas[type], ctx.request.body);

	if (typeValid.error) {
		ctx.status = 409;

		ctx.body = { validationError: typeValid.error.message };

		return;
	}

	if (!zelfName.includes(".zelf") || zelfName.length < 13) {
		ctx.status = 409;

		ctx.body = { validationError: "Not a valid zelf name" };

		return;
	}

	const origin = ctx.request.header.origin || "No Origin Header";
	const referer = ctx.request.header.referer || "No Referer Header";
	const clientIp = ctx.request.ip;
	const userAgent = ctx.request.header["user-agent"] || "No User Agent";

	console.log(`Request Details: 
    Origin: ${origin}
    Referer: ${referer}
    Client IP: ${clientIp}
    User Agent: ${userAgent}`);

	console.log({ body: { zelfName, type }, user: ctx.state.user });

	await next();
};

const previewValidation = async (ctx, next) => {
	const validation = validate(schemas.preview, ctx.request.body);

	if (validation.error) {
		ctx.status = 409;

		ctx.body = { validationError: validation.error.message };

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

	await next();
};

module.exports = {
	getValidation,
	leaseValidation,
	previewValidation,
	deleteValidation,
	decryptValidation,
};
