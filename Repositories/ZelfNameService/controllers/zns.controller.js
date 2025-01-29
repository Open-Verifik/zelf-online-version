const Module = require("../modules/zns.module");
const ZNSTokenModule = require("../modules/zns-token.module");
const RevenueCatModule = require("../modules/revenue-cat.module");

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
		const data = await Module.leaseZelfName({ ...ctx.request.body, zelfName: `${ctx.request.body.zelfName}`.toLowerCase() }, ctx.state.user);

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
		const data = await Module.previewZelfName(
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

const previewZelfProof = async (ctx) => {
	try {
		const data = await Module.previewZelfProof(ctx.request.body.zelfProof, ctx.state.user);

		ctx.body = { data };
	} catch (error) {
		console.error({ error });

		ctx.status = error.status || 500;

		ctx.body = { error: error.message };
	}
};

const decryptZelfName = async (ctx) => {
	try {
		const data = await Module.decryptZelfName(
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

const leaseOfflineZelfName = async (ctx) => {
	try {
		const data = await Module.leaseOffline(ctx.request.body, ctx.state.user);

		ctx.body = { data };
	} catch (error) {
		console.error({ error });
	}
};

const revenueCatWebhook = async (ctx) => {
	try {
		const data = await RevenueCatModule.webhookHandler(ctx.request.body);

		ctx.body = { data };
	} catch (error) {
		console.error(error);
	}
};

const referralRewards = async (ctx) => {
	try {
		const data = await ZNSTokenModule.releaseReward(ctx.state.user);

		ctx.body = { data };
	} catch (error) {
		console.error({ error });

		ctx.status = error.status || 500;

		ctx.body = { error: error.message };
	}
};

const update = async (ctx) => {
	try {
		const data = await Module.update(ctx.request.body, ctx.state.user);

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
	previewZelfProof,
	decryptZelfName,
	leaseOfflineZelfName,
	revenueCatWebhook,
	referralRewards,
	update,
};
