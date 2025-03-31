const Module = require("../modules/my-zns.module");

const transferZelfName = async (ctx) => {
	try {
		const data = await Module.transferMyZelfName(
			{
				...ctx.request.body,
				zelfName: `${ctx.request.body.zelfName}`.toLowerCase(),
			},
			ctx.state.user
		);

		ctx.body = { data };
	} catch (error) {
		console.error({ error });

		ctx.status = error.status || 500;

		ctx.body = { error: error.message };
	}
};

const renewZelfName = async (ctx) => {
	try {
		const data = await Module.renewMyZelfName(
			{
				...ctx.request.body,
				zelfName: `${ctx.request.body.zelfName}`.toLowerCase(),
			},
			ctx.state.user
		);

		ctx.body = { data };
	} catch (error) {
		console.error({ error });

		ctx.status = error.status || 500;

		ctx.body = { error: error.message };
	}
};

const howToRenewZelfName = async (ctx) => {
	try {
		const data = await Module.howToRenewMyZelfName(ctx.request.query, ctx.state.user);

		ctx.body = { data };
	} catch (error) {
		console.error({ error });

		ctx.status = error.status || 500;

		ctx.body = { error: error.message };
	}
};

module.exports = {
	transferZelfName,
	renewZelfName,
	howToRenewZelfName,
};
