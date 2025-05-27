const Module = require("../modules/lifi.module.js");

/**
 * @param {Object} ctx
 */
const getChains = async (ctx) => {
	try {
		const data = await Module.getChains(ctx.request.query);

		ctx.body = { data };
	} catch (error) {
		ctx.status = error.status || 500;

		ctx.body = { error: error.message };
	}
};

/**
 * @param {Object} ctx
 */
const getQuote = async (ctx) => {
	try {
		const data = await Module.getQuote(ctx.request.query);

		ctx.body = { data };
	} catch (error) {
		ctx.status = error.status || 500;

		ctx.body = { error: error.message };
	}
};

/**
 * @param {Object} ctx
 */
const getStatus = async (ctx) => {
	try {
		const data = await Module.getStatus(ctx.request.query);

		ctx.body = { data };
	} catch (error) {
		ctx.status = error.status || 500;

		ctx.body = { error: error.message };
	}
};

/**
 * @param {Object} ctx
 */
const getTokenByChainId = async (ctx) => {
	try {
		const data = await Module.getTokenByChainId(ctx.request.query);

		ctx.body = { data };
	} catch (error) {
		ctx.status = error.status || 500;

		ctx.body = { error: error.message };
	}
};

/**
 * @param {Object} ctx
 */
const getTokens = async (ctx) => {
	try {
		const data = await Module.getTokens(ctx.request.query);

		ctx.body = { data };
	} catch (error) {
		ctx.status = error.status || 500;

		ctx.body = { error: error.message };
	}
};

/**
 * @param {Object} ctx
 */
const getTools = async (ctx) => {
	try {
		const data = await Module.getTools(ctx.request.query);

		ctx.body = { data };
	} catch (error) {
		ctx.status = error.status || 500;

		ctx.body = { error: error.message };
	}
};

/**
 * @param {Object} ctx
 */
const executeSolanaSwap = async (ctx) => {
	try {
		const data = await Module.executeSolanaSwap(ctx.request.body);

		ctx.body = { data };
	} catch (error) {
		ctx.status = error.status || 500;

		ctx.body = { error: error.message };
	}
};

module.exports = {
	getChains,
	getQuote,
	getStatus,
	getTokenByChainId,
	getTokens,
	getTools,
	executeSolanaSwap,
};
