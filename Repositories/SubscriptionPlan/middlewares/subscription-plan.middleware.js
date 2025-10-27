const { string, validate } = require("../../../Core/JoiUtils");

const schemas = {
	getById: {
		productId: string().required(),
	},
	subscribe: {
		productId: string().required(),
		priceId: string().required(),
	},
};

const getByIdValidation = async (ctx, next) => {
	const { productId } = ctx.params;

	const valid = validate(schemas.getById, { productId });

	if (valid.error) {
		ctx.status = 409;
		ctx.body = { validationError: valid.error.message };
		return;
	}

	await next();
};

const subscribeValidation = async (ctx, next) => {
	const { productId, priceId } = ctx.request.body;

	const valid = validate(schemas.subscribe, { productId, priceId });

	if (valid.error) {
		ctx.status = 409;
		ctx.body = { validationError: valid.error.message };
		return;
	}

	await next();
};

const mySubscriptionValidation = async (ctx, next) => {
	await next();
};

const createPortalSessionValidation = async (ctx, next) => {
	// No specific validation needed for portal session creation
	// The user authentication is handled by the auth middleware
	await next();
};

module.exports = {
	getByIdValidation,
	subscribeValidation,
	mySubscriptionValidation,
	createPortalSessionValidation,
};
