/**
 * Controller for Arweave AR-IO ARNs operations
 */
const HttpHandler = require("../../../Core/http-handler");

const Module = require("../modules/ar-io-arns.module");

/**
 * Show AR-IO ARNs for a user
 * @param {Object} ctx - Koa context object
 */
const show = async (ctx) => {
	try {
		const data = await Module.get({ zelfName: ctx.request.params.zelfName, ...ctx.request.query }, ctx.state.user);
		ctx.body = data;
	} catch (error) {
		const _exception = HttpHandler.errorHandler(error);

		ctx.status = _exception.status;
		ctx.body = { message: _exception.message, code: _exception.code };
	}
};

/**
 * Create a new AR-IO ARN
 * @param {Object} ctx - Koa context object
 */
const create = async (ctx) => {
	try {
		const data = await Module.create({ zelfName: ctx.request.params.zelfName, ...ctx.request.body }, ctx.state.user);

		ctx.body = data;
	} catch (error) {
		const _exception = HttpHandler.errorHandler(error);

		ctx.status = _exception.status;
		ctx.body = { message: _exception.message, code: _exception.code };
	}
};

module.exports = {
	show,
	create,
};
