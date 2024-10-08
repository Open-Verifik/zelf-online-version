const { string, validate, boolean, number } = require("../../../Core/JoiUtils");

const schemas = {
	subscribe: {
		email: string().required(),
		list: string(),
		name: string(),
	},
	unsubscribe: {
		email: string().required(),
		list: string(),
	},
};

const subscribeValidation = async (ctx, next) => {
	const valid = validate(schemas.subscribe, ctx.request.body);

	if (valid.error) {
		ctx.status = 409;

		ctx.body = { validationError: valid.error.message };

		return;
	}

	await next();
};

const unsubscribeValidation = async (ctx, next) => {
	const valid = validate(schemas.unsubscribe, ctx.request.body);

	if (valid.error) {
		ctx.status = 409;

		ctx.body = { validationError: valid.error.message };

		return;
	}

	await next();
};

module.exports = {
	subscribeValidation,
	unsubscribeValidation,
};
