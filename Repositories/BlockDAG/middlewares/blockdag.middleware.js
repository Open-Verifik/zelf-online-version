const Joi = require("joi");

/**
 * Validate BlockDAG address format
 * @param {Object} ctx - Context object
 * @param {Function} next - Next function
 */
const validateAddress = async (ctx, next) => {
	const schema = Joi.object({
		address: Joi.string()
			.pattern(/^0x[a-fA-F0-9]{40}$/)
			.required(),
	});

	const { error } = schema.validate(ctx.request.params);
	if (error) {
		ctx.status = 400;
		ctx.body = {
			error: "Invalid address format. Must be a valid Ethereum address (0x followed by 40 hex characters)",
		};

		return;
	}

	await next();
};

/**
 * Validate BlockDAG address for transactions
 * @param {Object} ctx - Context object
 * @param {Function} next - Next function
 */
const validateAddressTransactions = async (ctx, next) => {
	const schema = Joi.object({
		address: Joi.string()
			.pattern(/^0x[a-fA-F0-9]{40}$/)
			.required(),
		page: Joi.string().optional(),
		show: Joi.string().optional(),
	});

	const { error } = schema.validate({ ...ctx.request.params, ...ctx.request.query });
	if (error) {
		ctx.status = 400;
		ctx.body = {
			error: "Invalid parameters. Address must be a valid Ethereum address",
		};

		return;
	}

	await next();
};

module.exports = {
	validateAddress,
	validateAddressTransactions,
};

