const Module = require("../modules/purchase.module");
const HttpHandler = require("../../../Core/http-handler");

const checkout = async (ctx) => {
	try {
		const data = await Module.getCheckout(ctx.request.query);

		ctx.body = { data };
	} catch (error) {
		console.error(error);

		ctx.status = error.status || 500;

		ctx.body = { error: error.message };
	}
};

module.exports = {
	checkout,
};
