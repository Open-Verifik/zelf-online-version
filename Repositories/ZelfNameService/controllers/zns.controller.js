const Module = require("../modules/zns.module");

const searchZelfName = async (ctx) => {
	try {
		const data = await Module.searchZelfName(ctx.request.query, ctx.state.user);

		ctx.body = { data };
	} catch (error) {
		console.error({ error });
		ctx.status = error.status || 500;

		ctx.body = { error: error.message };
	}
};

const leaseZelfName = async (ctx) => {
	try {
		const data = await Module.leaseZelfName(ctx.request.body, ctx.state.user);

		ctx.body = { data };
	} catch (error) {
		console.error({ error });

		ctx.status = error.status || 500;

		ctx.body = { error: error.message };
	}
};

const leaseConfirmation = async (ctx) => {
	try {
		const data = await Module.leaseConfirmation(ctx.request.body, ctx.state.user);

		ctx.body = { data };
	} catch (error) {
		console.error({ error });

		ctx.status = error.status || 500;

		ctx.body = { error: error.message };
	}
};

const previewZelfName = async (ctx) => {
	try {
		const data = await Module.previewZelfName(ctx.request.body, ctx.state.user);

		ctx.body = { data };
	} catch (error) {
		console.error({ error });

		ctx.status = error.status || 500;

		ctx.body = { error: error.message };
	}
};

const decryptZelfName = async (ctx) => {
	try {
		const data = await Module.decryptZelfName(ctx.request.body, ctx.state.user);

		ctx.body = { data };
	} catch (error) {
		console.error({ error });

		ctx.status = error.status || 500;

		ctx.body = { error: error.message };
	}
};

const leaseOfflineZelfName = async (ctx) => {
	// lease offline zelf name
	try {
		const data = await Module.leaseOffline(ctx.request.body, ctx.state.user);

		ctx.body = { data };
	} catch (error) {
		console.error({ error });

		ctx.status = error.status || 500;

		ctx.body = { error: error.message };
	}
};

module.exports = {
	searchZelfName,
	leaseZelfName,
	leaseConfirmation,
	previewZelfName,
	decryptZelfName,
	//offline
	leaseOfflineZelfName,
};
