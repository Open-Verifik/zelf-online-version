const { string, validate } = require("../../../Core/JoiUtils");

const schemas = {
	asset: {
		network: string().required(),
		symbol: string().required(),
	},
};

const validateAssetDetails = async (ctx, next) => {
	const valid = validate(schemas.asset, { ...ctx.params, ...ctx.request.query });

	if (valid.error) {
		ctx.status = 409;

		ctx.body = { validationError: valid.error.message };

		return;
	}

	await next();
};

module.exports = {
	validateAssetDetails,
};
