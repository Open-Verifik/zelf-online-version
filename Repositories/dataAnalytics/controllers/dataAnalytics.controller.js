const Module = require("../modules/dataAnalytics.module");
const HttpHandler = require("../../../Core/http-handler");

const data_analytics = async (ctx) => {
	try {
		const data = await Module.get_data_analytics(ctx.request.query);

		ctx.body = { data };
	} catch (error) {
		console.error(error);

		ctx.status = error.status || 500;

		ctx.body = { error: error.message };
	}
};

module.exports = {
	data_analytics,
};
