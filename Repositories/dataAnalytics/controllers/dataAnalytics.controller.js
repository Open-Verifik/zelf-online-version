const Module = require("../modules/dataAnalytics.module");
const HttpHandler = require("../../../Core/http-handler");

const data_analytics = async (ctx) => {
	try {
		const data = await Module.get_data_analytics(
			{
				asset: ctx.params.asset,
				currency: ctx.params.currency,
			},
			{ langCode: ctx.query.langCode }
		);

		ctx.body = { data };
	} catch (error) {
		console.error(error);

		ctx.status = error.status || 500;

		ctx.body = { error: error.message };
	}
};

const chart_data = async (ctx) => {
	const asset = ctx.params.asset;
	const range = ctx.query.range;

	try {
		const data = await Module.get_chart_data(asset, range);

		ctx.body = { data };
	} catch (error) {
		console.error(error);

		ctx.status = error.status || 500;

		ctx.body = { error: error.message };
	}
};

module.exports = {
	data_analytics,
	chart_data,
};
