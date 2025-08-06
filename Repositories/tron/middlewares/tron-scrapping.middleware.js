const Joi = require("joi");

/**
 * Validate Tron address format (Base58 starting with 'T')
 * @param {Object} req - Request object
 * @param {Object} res - Response object
 * @param {Function} next - Next function
 */
const validateAddress = async (ctx, next) => {
	const schema = Joi.object({
		address: Joi.string()
			.length(34)
			.pattern(/^T[1-9A-HJ-NP-Za-km-z]{33}$/)
			.required(),
	});

	const { error } = schema.validate(ctx.request.params);
	if (error) {
		ctx.status = 400;
		ctx.body = {
			error: "Invalid address format. Must be a valid Tron address (Base58 format starting with 'T' and 34 characters long)",
		};

		return;
	}

	await next();
};

/**
 * Validate Tron address for transactions
 * @param {Object} req - Request object
 * @param {Object} res - Response object
 * @param {Function} next - Next function
 */
const validateAddressTransactions = async (ctx, next) => {
	const schema = Joi.object({
		address: Joi.string()
			.length(34)
			.pattern(/^T[1-9A-HJ-NP-Za-km-z]{33}$/)
			.required(),
		page: Joi.string().optional(),
		show: Joi.string().optional(),
	});

	const { error } = schema.validate({ ...ctx.request.params, ...ctx.request.query });
	if (error) {
		ctx.status = 400;
		ctx.body = {
			error: "Invalid parameters. Address must be a valid Tron address",
		};

		return;
	}

	await next();
};

module.exports = {
	validateAddress,
	validateAddressTransactions,
};
