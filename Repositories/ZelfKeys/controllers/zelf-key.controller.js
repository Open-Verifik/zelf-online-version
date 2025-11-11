/**
 * ZelfKey Controller - Handles HTTP requests for password manager operations
 * @author Miguel Trevino <miguel@zelf.world>
 */

const Module = require("../modules/zelf-key.module.js");
const { errorHandler } = require("../../../Core/http-handler");

/**
 * Store website password specifically
 * @param {Object} ctx - Koa context
 */
const storePassword = async (ctx) => {
	try {
		const data = await Module.storeData(
			{
				...ctx.request.body,
				type: "password",
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

/**
 * Store ZOTP
 * @param {Object} ctx - Koa context
 */
const storeZOTP = async (ctx) => {
	try {
		const data = await Module.storeData(
			{
				...ctx.request.body,
				type: "zotp",
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

/**
 * Store notes as key-value pairs
 * @param {Object} ctx - Koa context
 */
const storeNotes = async (ctx) => {
	try {
		const data = await Module.storeData(
			{
				...ctx.request.body,
				type: "notes",
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

/**
 * Store credit card information
 * @param {Object} ctx - Koa context
 */
const storeCreditCard = async (ctx) => {
	try {
		const data = await Module.storeData(
			{
				...ctx.request.body,
				type: "credit_card",
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

/**
 * Retrieve stored data (decrypt)
 * @param {Object} ctx - Koa context
 */
const retrieveData = async (ctx) => {
	try {
		const data = await Module.retrieveData(ctx.request.body, ctx.state.user);

		ctx.body = { data };
	} catch (error) {
		const _exception = errorHandler(error, ctx);

		ctx.status = _exception.status;

		ctx.body = { message: _exception.message, code: _exception.code };
	}
};

/**
 * Preview stored data without full decryption
 * @param {Object} ctx - Koa context
 */
const previewData = async (ctx) => {
	try {
		const data = await Module.previewData(ctx.request.body, ctx.state.user);

		ctx.body = { data };
	} catch (error) {
		const _exception = errorHandler(error, ctx);

		ctx.status = _exception.status;

		ctx.body = { message: _exception.message, code: _exception.code };
	}
};

/**
 * List data by category
 * @param {Object} ctx - Koa context
 */
const listData = async (ctx) => {
	try {
		const data = await Module.listData(ctx.request.query, ctx.state.user);

		ctx.body = { data };
	} catch (error) {
		const _exception = errorHandler(error, ctx);

		ctx.status = _exception.status;

		ctx.body = { message: _exception.message, code: _exception.code };
	}
};

/**
 * Delete ZelfKey
 * @param {Object} ctx - Koa context
 */
const deleteZelfKey = async (ctx) => {
	try {
		const data = await Module.deleteZelfKey(
			{
				id: ctx.request.params.id,
				faceBase64: ctx.request.body.faceBase64,
				masterPassword: ctx.request.body.masterPassword,
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
	storePassword,
	storeZOTP,
	storeNotes,
	storeCreditCard,
	retrieveData,
	previewData,
	listData,
	deleteZelfKey,
};
