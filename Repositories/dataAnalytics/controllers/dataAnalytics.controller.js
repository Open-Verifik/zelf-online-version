const Module = require("../modules/dataAnalytics.module");
const HttpHandler = require("../../../Core/http-handler");

const data_analytics = async (ctx) => {
	try {
		const data = await Module.get_data_analytics({ network: ctx.params.network, symbol: ctx.params.symbol });

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
