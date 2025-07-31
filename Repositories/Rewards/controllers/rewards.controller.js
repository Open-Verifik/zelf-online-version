const Module = require("../modules/rewards.module");

const get = async (ctx) => {
	try {
		const data = await Module.get(ctx.request.params, ctx.state.user);

		ctx.body = data;
	} catch (error) {
		console.error({ error });

		ctx.status = error.status || 500;

		ctx.body = { error: error.message };
	}
};

const show = async (ctx) => {
	try {
		const data = await Module.show(ctx.request.params, ctx.state.user);

		ctx.body = data;
	} catch (error) {
		console.error(error);
		ctx.status = error.status || 500;

		ctx.body = { error: error.message };
	}
};

const create = async (ctx) => {
	try {
		const data = await Module.create(ctx.request.body, ctx.state.user);

		ctx.body = data;
	} catch (error) {
		console.error(error);
		ctx.status = error.status || 500;

		ctx.body = { error: error.message };
	}
};

const update = async (ctx) => {
	try {
		const data = await Module.update(ctx.request.body, ctx.state.user);

		ctx.body = { data };
	} catch (error) {
		console.error(error);
		ctx.status = error.status || 500;

		ctx.body = { error: error.message };
	}
};

const destroy = async (ctx) => {
	try {
		const data = await Module.destroy(ctx.request.params, ctx.state.user);

		ctx.body = { data };
	} catch (error) {
		console.error(error);
		ctx.status = error.status || 500;

		ctx.body = { error: error.message };
	}
};

const dailyRewards = async (ctx) => {
	try {
		const data = await Module.dailyRewards(ctx.request.body, ctx.state.user);

		ctx.body = data;
	} catch (error) {
		console.error(error);
		ctx.status = error.status || 500;

		ctx.body = { error: error.message };
	}
};

const rewardHistory = async (ctx) => {
	try {
		const { zelfName } = ctx.request.params;
		const { limit } = ctx.request.query;

		const data = await Module.getUserRewardHistory(zelfName, limit);

		ctx.body = data;
	} catch (error) {
		console.error(error);
		ctx.status = error.status || 500;

		ctx.body = { error: error.message };
	}
};

const rewardStats = async (ctx) => {
	try {
		const { zelfName } = ctx.request.params;

		const data = await Module.getUserRewardStats(zelfName);

		ctx.body = data;
	} catch (error) {
		console.error(error);
		ctx.status = error.status || 500;

		ctx.body = { error: error.message };
	}
};

module.exports = {
	get,
	show,
	create,
	update,
	destroy,
	dailyRewards,
	rewardHistory,
	rewardStats,
};
