const Module = require("../modules/dataAnalytics.module");

const data_analytics = async (ctx) => {
	try {
		const data = await Module.getAssetDetails({ ...ctx.params, ...ctx.query });

		ctx.body = { data };
	} catch (error) {
		console.error(error);

		ctx.status = error.status || 500;

		ctx.body = { error: error.message };
	}
};

const chart_data = async (ctx) => {
	try {
		const data = await Module.getChart({ ...ctx.params, ...ctx.query });

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
