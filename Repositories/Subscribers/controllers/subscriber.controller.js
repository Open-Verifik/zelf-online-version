const Module = require("../modules/subscriber.module");

const subscribe = async (ctx) => {
	try {
		const data = await Module.subscribe(ctx.request.body, ctx.state.user);

		ctx.body = { data };
	} catch (error) {
		console.error(error);
		ctx.status = error.status || 500;

		ctx.body = { error: error.message };
	}
};

const unsubscribe = async (ctx) => {
	try {
		const data = await Module.unsubscribe(ctx.request.body, ctx.state.user);

		ctx.body = { data };
	} catch (error) {
		console.error(error);
		ctx.status = error.status || 500;

		ctx.body = { error: error.message };
	}
};

module.exports = {
	subscribe,
	unsubscribe,
};
