const { string, validate } = require("../../../Core/JoiUtils");

const schemas = {
	asset: {
		asset: string().required(),
		currency: string().required(),
	},
	asset_chart_data: {
		interval: string().required(),
	},
};

const validateAssetDetails = async (ctx, next) => {
	const valid = validate(schemas.asset, {
		...ctx.params,
		...ctx.request.query,
	});

	if (valid.error) {
		ctx.status = 409;

		ctx.body = { validationError: valid.error.message };

		return;
	}

	await next();
};
const validateChart = async (ctx, next) => {
	const valid = validate(schemas.asset_chart_data, {
		...ctx.params,
		...ctx.query,
	});

	if (valid.error) {
		ctx.status = 409;
		ctx.body = { validationError: valid.error.message };
		return;
	}

	await next();
};
module.exports = {
	validateAssetDetails,
	validateChart,
};
