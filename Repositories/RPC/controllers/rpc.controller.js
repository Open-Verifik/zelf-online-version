const Module = require("../modules/rpc.module");

const sendTransaction = async (ctx) => {
	try {
		const data = await Module.sendTransaction(ctx.request.body);

		ctx.body = { data };
	} catch (error) {
		console.error({ error });

		ctx.status = error.status || 500;

		ctx.body = { error: error.message };
	}
};

module.exports = {
	sendTransaction,
};
