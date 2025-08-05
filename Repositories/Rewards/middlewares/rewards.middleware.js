const Joi = require("joi");

const dailyRewardsValidation = async (ctx, next) => {
	try {
		const schema = Joi.object({
			zelfName: Joi.string().required().min(3).max(27),
		});

		await schema.validateAsync(ctx.request.body);

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
};
