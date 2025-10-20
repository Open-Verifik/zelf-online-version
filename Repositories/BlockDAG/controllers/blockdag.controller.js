const {
	getAddress,
	getTokens,
	getTransactionsList,
	getTransactionStatus,
	getGasTracker,
	getPortfolioSummary,
} = require("../modules/blockdag.module");

/**
 * Get comprehensive address information for BlockDAG
 * @param {Object} ctx - Context object
 */
const address = async (ctx) => {
	try {
		const { address } = ctx.request.params;

		const data = await getAddress({ address, ...ctx.request.query });
		ctx.body = data;
	} catch (error) {
		console.error("BlockDAG address controller error:", error.message);
		ctx.status = 500;
		ctx.body = { error: "Internal server error" };
	}
};

/**
 * Get ERC20 tokens for a BlockDAG address
 * @param {Object} ctx - Context object
 */
const tokens = async (ctx) => {
	try {
		const { address } = ctx.request.params;

		const data = await getTokens({ address }, ctx.request.query);
		ctx.body = data;
	} catch (error) {
		console.error("BlockDAG tokens controller error:", error.message);
		ctx.status = 500;
		ctx.body = { error: "Internal server error" };
	}
};

/**
 * Get transaction list for a BlockDAG address
 * @param {Object} ctx - Context object
 */
const transactions = async (ctx) => {
	try {
		const { address } = ctx.request.params;

		const data = await getTransactionsList({ address, ...ctx.request.query });
		ctx.body = data;
	} catch (error) {
		console.error("BlockDAG transactions controller error:", error.message);
		ctx.status = 500;
		ctx.body = { error: "Internal server error" };
	}
};

/**
 * Get transaction status/details for a BlockDAG transaction
 * @param {Object} ctx - Context object
 */
const transactionStatus = async (ctx) => {
	try {
		const { id } = ctx.params;

		const data = await getTransactionStatus({ id });
		ctx.body = data;
	} catch (error) {
		console.error("BlockDAG transaction status controller error:", error.message);
		ctx.status = 500;
		ctx.body = { error: "Internal server error" };
	}
};

/**
 * Get gas tracker information for BlockDAG
 * @param {Object} ctx - Context object
 */
const gasTracker = async (ctx) => {
	try {
		const data = await getGasTracker(ctx.request.query);
		ctx.body = data;
	} catch (error) {
		console.error("BlockDAG gas tracker controller error:", error.message);
		ctx.status = 500;
		ctx.body = { error: "Internal server error" };
	}
};

/**
 * Get portfolio summary for a BlockDAG address
 * @param {Object} ctx - Context object
 */
const portfolioSummary = async (ctx) => {
	try {
		const { address } = ctx.request.params;

		const data = await getPortfolioSummary({ address });
		ctx.body = data;
	} catch (error) {
		console.error("BlockDAG portfolio summary controller error:", error.message);
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

