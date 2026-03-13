const Module = require("../modules/license.module");
const { errorHandler } = require("../../../Core/http-handler");

/**
 * Search for license by domain
 * @param {Object} ctx - Koa context
 * @returns {Object} - Search results
 */
const searchLicense = async (ctx) => {
	try {
		const data = await Module.searchLicense(ctx.request.query, ctx.state.user);

		ctx.body = { data };
	} catch (error) {
		const _exception = errorHandler(error, ctx);

		ctx.status = _exception.status;

		ctx.body = { message: _exception.message, code: _exception.code };
	}
};

/**
 * Get user's own licenses
 * @param {Object} ctx - Koa context
 * @returns {Object} - User's licenses
 */
const getMyLicense = async (ctx) => {
	try {
		const data = await Module.getMyLicense(ctx.state.user, ctx.request.query.withJSON);

		ctx.body = { data };
	} catch (error) {
		const _exception = errorHandler(error, ctx);

		ctx.status = _exception.status;

		ctx.body = { message: _exception.message, code: _exception.code };
	}
};

/**
 * Create or update license
 * @param {Object} ctx - Koa context
 * @returns {Object} - License creation/update results
 */
const createOrUpdateLicense = async (ctx) => {
	try {
		const data = await Module.createOrUpdateLicense(ctx.request.body, ctx.state.user);

		// reload the official licenses in the cache file
		Module.loadOfficialLicenses(true);

		ctx.body = { data };
	} catch (error) {
		const _exception = errorHandler(error, ctx);

		ctx.status = _exception.status;

		ctx.body = { message: _exception.message, code: _exception.code };
	}
};

/**
 * Delete license by IPFS hash
 * @param {Object} ctx - Koa context
 * @returns {Object} - Deletion confirmation
 */
const deleteLicense = async (ctx) => {
	try {
		const data = await Module.deleteLicense(ctx.request.body, ctx.state.user);

		// reload the official licenses in the cache file
		await Module.loadOfficialLicenses(true);

		ctx.body = { data };
	} catch (error) {
		const _exception = errorHandler(error, ctx);

		ctx.status = _exception.status;

		ctx.body = { message: _exception.message, code: _exception.code };
	}
};

module.exports = {
	searchLicense,
	getMyLicense,
	createOrUpdateLicense,
	deleteLicense,
};
