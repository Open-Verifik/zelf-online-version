const Module = require("../modules/rewards.module");

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

const firstTransactionReward = async (ctx) => {
	try {
		const data = await Module.rewardFirstTransaction(ctx.request.body, ctx.state.user);

		ctx.body = data;
	} catch (error) {
		console.error(error);
		ctx.status = error.status || 500;

		ctx.body = { error: error.message };
	}
};

module.exports = {
	dailyRewards,
	rewardHistory,
	rewardStats,
	firstTransactionReward,
};
