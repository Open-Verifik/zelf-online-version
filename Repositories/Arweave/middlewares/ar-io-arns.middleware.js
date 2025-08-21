/**
 * Middleware for Arweave AR-IO ARNs validation
 */

/**
 * Validation middleware for showing AR-IO ARNs
 * @param {Object} ctx - Koa context object
 * @param {Function} next - Next function
 */
const showValidation = async (ctx, next) => {
	// TODO: Add validation logic here
	await next();
};

/**
 * Validation middleware for creating AR-IO ARNs
 * @param {Object} ctx - Koa context object
 * @param {Function} next - Next function
 */
const createValidation = async (ctx, next) => {
	// TODO: Add validation logic here
	await next();
};

module.exports = {
	showValidation,
	createValidation,
};
