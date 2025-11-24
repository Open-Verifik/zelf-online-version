const config = require("../../../Core/config");
const { validate, string } = require("../../../Core/JoiUtils");
const MongoORM = require("../../../Core/mongo-orm");
const Session = require("../models/session.model");

const schema = {
	publicKey: {
		identifier: string().required(),
	},
	insert: {
		identifier: string().required(),
		domain: string().required(),
	},
	decrypt: {
		message: string().required(),
	},
};

const getValidation = async (request, response) => {};

/**
 * Show Validation
 * @param {*} request
 * @param {*} response
 */
const showValidation = async (request, response) => {};

/**
 * Create Validation
 * @param {*} request
 * @param {*} response
 */
const createValidation = (request, response, next) => {
	request.params = JSON.parse(request.body);

	return next();
};

/**
 * Update Validation
 * @param {*} request
 * @param {*} response
 * @param {*} next
 */
const updateValidation = async (request, response) => {};

/**
 * Destroy Validation
 * @param {*} request
 * @param {*} response
 * @param {*} next
 */
const destroyValidation = async (request, response) => {};

const getPublicKeyValidation = async (ctx, next) => {
	const valid = validate(schema.publicKey, ctx.query);

	if (valid.error) {
		ctx.status = 409;

		ctx.body = { validationError: valid.error.message };

		return;
	}

	await next();
};

const decryptValidation = async (ctx, next) => {
	const valid = validate(schema.decrypt, ctx.request.body);

	if (valid.error) {
		ctx.status = 409;

		ctx.body = { validationError: valid.error.message };

		return;
	}

	await next();
};

const validateJWT = async (ctx, next) => {
	const authUser = ctx.state.user;

	if (!authUser.session) {
		await next();

		return;
	}

	const session = await MongoORM.buildQuery(
		{
			where__id: authUser.session,
			findOne: true,
		},
		Session,
		null,
		[]
	);

	if (session?.globalCount > config.sessions?.globalLimit) {
		ctx.status = 401;
		ctx.body = { error: "Invalid session" };
		return;
	}

	session?.globalCount += 1;

	await session?.save();

	await next();
};

module.exports = {
	getValidation,
	showValidation,
	createValidation,
	updateValidation,
	destroyValidation,
	getPublicKeyValidation,
	decryptValidation,
	validateJWT,
};
