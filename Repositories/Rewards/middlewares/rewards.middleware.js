const Joi = require("joi");

// Utility function to normalize zelfName with .zelf suffix
const normalizeZelfName = (zelfName) => {
	return zelfName.endsWith(".zelf") ? zelfName : `${zelfName}.zelf`;
};

const dailyRewardsValidation = async (ctx, next) => {
	try {
		const schema = Joi.object({
			zelfName: Joi.string().required().min(3).max(27),
		});

		await schema.validateAsync(ctx.request.body);

		// Normalize zelfName to include .zelf suffix if missing
		ctx.request.body.zelfName = normalizeZelfName(ctx.request.body.zelfName);

		await next();
	} catch (error) {
		ctx.status = 400;
		ctx.body = { error: error.message };
	}
};

const rewardHistoryValidation = async (ctx, next) => {
	try {
		const paramsSchema = Joi.object({
			zelfName: Joi.string().required().min(3).max(27),
		});

		const querySchema = Joi.object({
			limit: Joi.number().optional().min(1).max(100).default(10),
		});

		await paramsSchema.validateAsync(ctx.request.params);
		await querySchema.validateAsync(ctx.request.query);

		// Normalize zelfName to include .zelf suffix if missing
		ctx.request.params.zelfName = normalizeZelfName(ctx.request.params.zelfName);

		await next();
	} catch (error) {
		ctx.status = 400;
		ctx.body = { error: error.message };
	}
};

const rewardStatsValidation = async (ctx, next) => {
	try {
		const schema = Joi.object({
			zelfName: Joi.string().required().min(3).max(27),
		});

		await schema.validateAsync(ctx.request.params);

		// Normalize zelfName to include .zelf suffix if missing
		ctx.request.params.zelfName = normalizeZelfName(ctx.request.params.zelfName);

		await next();
	} catch (error) {
		ctx.status = 400;
		ctx.body = { error: error.message };
	}
};

const firstTransactionRewardValidation = async (ctx, next) => {
	try {
		const schema = Joi.object({
			zelfName: Joi.string().required().min(3).max(27),
		});

		await schema.validateAsync(ctx.request.body);

		// Normalize zelfName to include .zelf suffix if missing
		ctx.request.body.zelfName = normalizeZelfName(ctx.request.body.zelfName);

		await next();
	} catch (error) {
		ctx.status = 400;
		ctx.body = { error: error.message };
	}
};

module.exports = {
	dailyRewardsValidation,
	rewardHistoryValidation,
	rewardStatsValidation,
	firstTransactionRewardValidation,
	normalizeZelfName, // Export the utility function for use in other modules
};
