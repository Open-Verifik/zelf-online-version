const { string, validate, boolean, number, stringEnum, email } = require("../../../Core/JoiUtils");
const configuration = require("../../../Core/config");

const schemas = {
	get: {},
	show: {},
	create: {
		name: string().required(),
		countryCode: string().required(),
		phone: string().required(),
		email: email().required(),
		language: stringEnum(["en", "es"]),
		company: string().required(),
		faceBase64: string().required(),
		masterPassword: string().required(),
	},
	update: {
		faceBase64: string().required(),
		masterPassword: string().required(),
		name: string(),
		email: email(),
		countryCode: string(),
		phone: string(),
		company: string(),
	},
	destroy: {},
	auth: {
		email: email(),
		countryCode: string(),
		phone: string(),
		faceBase64: string().required(),
		masterPassword: string().required(),
		identificationMethod: string().required(),
	},
	updatePassword: {
		newPassword: string().required().min(8),
		confirmPassword: string().required(),
		faceBase64: string().required(),
		masterPassword: string().required(),
	},
};

const getValidation = async (ctx, next) => {
	const apiKey = ctx.headers["x-api-key"];

	if (!apiKey || apiKey !== configuration.SUPERADMIN_JWT_SECRET) {
		ctx.status = 403;

		ctx.body = { validationError: "ApiKey not valid" };

		return;
	}

	const valid = validate(schemas.get, ctx.request.params);

	if (valid.error) {
		ctx.status = 409;

		ctx.body = { validationError: valid.error.message };

		return;
	}

	await next();
};

const showValidation = async (ctx, next) => {
	const apiKey = ctx.headers["x-api-key"];

	const valid = validate(schemas.show, ctx.request.body);

	if (valid.error) {
		ctx.status = 409;

		ctx.body = { validationError: valid.error.message };

		return;
	}

	await next();
};

const createValidation = async (ctx, next) => {
	const valid = validate(schemas.create, ctx.request.body);

	if (valid.error) {
		ctx.status = 409;

		ctx.body = { validationError: valid.error.message };

		return;
	}

	await next();
};

const destroyValidation = async (ctx, next) => {
	const valid = validate(schemas.destroy, ctx.request.body);

	if (valid.error) {
		ctx.status = 409;

		ctx.body = { validationError: valid.error.message };

		return;
	}

	await next();
};

const updateValidation = async (ctx, next) => {
	const valid = validate(schemas.update, ctx.request.body);

	if (valid.error) {
		ctx.status = 409;

		ctx.body = { validationError: valid.error.message };

		return;
	}

	await next();
};

const authValidation = async (ctx, next) => {
	const valid = validate(schemas.auth, ctx.request.body);

	if (valid.error) {
		ctx.status = 409;

		ctx.body = { validationError: valid.error.message };

		return;
	}

	await next();
};

const updatePasswordValidation = async (ctx, next) => {
	const valid = validate(schemas.updatePassword, ctx.request.body);

	if (valid.error) {
		ctx.status = 409;

		ctx.body = { validationError: valid.error.message };

		return;
	}

	// Additional validation: check if passwords match
	const { newPassword, confirmPassword } = ctx.request.body;
	if (newPassword !== confirmPassword) {
		ctx.status = 409;
		ctx.body = { validationError: "Passwords do not match" };
		return;
	}

	await next();
};

module.exports = {
	getValidation,
	showValidation,
	createValidation,
	updateValidation,
	destroyValidation,
	authValidation,
	updatePasswordValidation,
};
