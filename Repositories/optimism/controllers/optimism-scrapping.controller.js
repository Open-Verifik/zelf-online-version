const {
	getAddress,
	getTokens,
	getTransactionsList,
	getTransactionStatus,
	getGasTracker,
	getPortfolioSummary,
} = require("../modules/optimism-scrapping.module");

/**
 * Get comprehensive address information for OP Mainnet
 * @param {Object} req - Request object
 * @param {Object} res - Response object
 */
const address = async (ctx) => {
	try {
		const { address } = ctx.request.params;

		const data = await getAddress({ address, ...ctx.request.query });
		ctx.body = data;
	} catch (error) {
		console.error("Optimism address controller error:", error.message);
		ctx.status = 500;
		ctx.body = { error: "Internal server error" };
	}
};

/**
 * Get ERC20 tokens for an OP Mainnet address
 * @param {Object} req - Request object
 * @param {Object} res - Response object
 */
const tokens = async (ctx) => {
	try {
		const { address } = ctx.request.params;

		const data = await getTokens({ address }, ctx.request.query);
		ctx.body = data;
	} catch (error) {
		console.error("Optimism tokens controller error:", error.message);
		ctx.status = 500;
		ctx.body = { error: "Internal server error" };
	}
};

/**
 * Get transaction list for an OP Mainnet address
 * @param {Object} req - Request object
 * @param {Object} res - Response object
 */
const transactions = async (ctx) => {
	try {
		const { address } = ctx.request.params;

		const data = await getTransactionsList({ address, ...ctx.request.query });
		ctx.body = data;
	} catch (error) {
		console.error("Optimism transactions controller error:", error.message);
		ctx.status = 500;
		ctx.body = { error: "Internal server error" };
	}
};

/**
 * Get transaction status/details for an OP Mainnet transaction
 * @param {Object} req - Request object
 * @param {Object} res - Response object
 */
const transactionStatus = async (ctx) => {
	try {
		const { id } = ctx.params;

		const data = await getTransactionStatus({ id });
		ctx.body = data;
	} catch (error) {
		console.error("Optimism transaction status controller error:", error.message);
		ctx.status = 500;
		ctx.body = { error: "Internal server error" };
	}
};

/**
 * Get gas tracker information for OP Mainnet
 * @param {Object} req - Request object
 * @param {Object} res - Response object
 */
const gasTracker = async (ctx) => {
	try {
		const data = await getGasTracker(ctx.request.query);
		ctx.body = data;
	} catch (error) {
		console.error("Optimism gas tracker controller error:", error.message);
		ctx.status = 500;
		ctx.body = { error: "Internal server error" };
	}
};

/**
 * Get portfolio summary for an OP Mainnet address (like OKLink dashboard)
 * @param {Object} req - Request object
 * @param {Object} res - Response object
 */
const portfolioSummary = async (ctx) => {
	try {
		const { address } = ctx.request.params;

		const data = await getPortfolioSummary({ address });
		ctx.body = data;
	} catch (error) {
		console.error("Optimism portfolio summary controller error:", error.message);
		ctx.status = 500;
		ctx.body = { error: "Internal server error" };
	}
};

module.exports = {
	address,
	tokens,
	transactions,
	transactionStatus,
	gasTracker,
	portfolioSummary,
};
