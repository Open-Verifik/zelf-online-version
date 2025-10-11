const Module = require("../modules/theme.module");
const { errorHandler } = require("../../../Core/http-handler");

/**
 * Get user's theme settings
 * @param {Object} ctx - Koa context
 * @returns {Object} - Theme settings
 */
const getThemeSettings = async (ctx) => {
	try {
		const data = await Module.getThemeSettings(ctx.state.user);

		ctx.body = { data };
	} catch (error) {
		const _exception = errorHandler(error, ctx);

		ctx.status = _exception.status;

		ctx.body = { message: _exception.message, code: _exception.code };
	}
};

/**
 * Update user's theme settings
 * @param {Object} ctx - Koa context
 * @returns {Object} - Updated theme settings
 */
const updateThemeSettings = async (ctx) => {
	try {
		const payload = Object.assign(ctx.request.query, ctx.request.body);
		const { faceBase64, masterPassword, themeSettings } = payload;

		const data = await Module.updateThemeSettings(
			{
				faceBase64,
				masterPassword,
				themeSettings,
			},
			ctx.state.user
		);

		ctx.body = { data };
	} catch (error) {
		const _exception = errorHandler(error, ctx);

		ctx.status = _exception.status;

		ctx.body = { message: _exception.message, code: _exception.code };
	}
};

module.exports = {
	getThemeSettings,
	updateThemeSettings,
};
