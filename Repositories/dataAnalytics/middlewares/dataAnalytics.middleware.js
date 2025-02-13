const { string, validate } = require("../../../Core/JoiUtils");

const schemas = {
	validateAnalytics_: {
		network: string().required(),
		symbol: string().required(),
	},
};

const validateAnalytics = async (ctx, next) => {
	const valid = validate(schemas.validateAnalytics_, ctx.request.query);

	if (valid.error) {
		ctx.status = 409;

		ctx.body = { validationError: valid.error.message };

		return;
	}

	await next();
};

module.exports = {
	validateAnalytics,
};
