const config = require("../../../Core/config");

const Controller = require("../controllers/rewards.controller");
const Middleware = require("../middlewares/rewards.middleware");
const primaryKey = "id";
const base = "/rewards";

module.exports = (server) => {
	const PATH = config.basePath(base);

	// Daily rewards endpoint
	server.post(`${PATH}/daily`, Middleware.dailyRewardsValidation, Controller.dailyRewards);

	// First transaction reward endpoint
	server.post(`${PATH}/first-transaction`, Middleware.firstTransactionRewardValidation, Controller.firstTransactionReward);

	// User reward history endpoint
	server.get(`${PATH}/history/:zelfName`, Middleware.rewardHistoryValidation, Controller.rewardHistory);

	// User reward statistics endpoint
	server.get(`${PATH}/stats/:zelfName`, Middleware.rewardStatsValidation, Controller.rewardStats);
};
