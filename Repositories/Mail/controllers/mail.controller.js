const webhookHandler = async (ctx) => {
	try {
		const data = {
			payload: ctx.request.body,
		};

		ctx.body = { data };
	} catch (error) {
		ctx.status = error?.status || 500;

		ctx.body = { error: error?.message || error };
	}
};

module.exports = {
	webhookHandler,
};
