const { string, validate, boolean, number } = require("../../../Core/JoiUtils");

const schemas = {
	upload: {
		base64: string().required(),
		name: string().required(),
	},
};

/**
 * Get Validation
 * @param {*} request
 * @param {*} response
 * @param {*} next
 */
const getValidation = async (ctx, next) => {
	await next();
};

/**
 * Create Validation
 * @param {*} request
 * @param {*} response
 * @param {*} next
 */
const createValidation = async (ctx, next) => {
	const valid = validate(schemas.upload, ctx.request.body);

	if (valid.error) {
		ctx.status = 409;

		ctx.body = { validationError: valid.error.message };

		return;
	}

	await next();
};

const deleteValidation = async (ctx, next) => {
	await next();
};

const showValidation = async (ctx, next) => {
	await next();
};

module.exports = {
	getValidation,
	createValidation,
	deleteValidation,
	showValidation,
};
