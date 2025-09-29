const Module = require("../modules/tags.module");
const RevenueCatModule = require("../modules/revenue-cat.module");
const { updateOldTagObject } = require("../modules/my-tags.module");
const TagsRecoveryModule = require("../modules/tags-recovery.module");
const HttpHandler = require("../../../Core/http-handler");
const TagsOfflineModule = require("../modules/tags-offline.module");
const TagsSearchModule = require("../modules/tags-search.module");

/**
 * Standard error handler for controllers
 * @param {Object} ctx - Koa context
 * @param {Error} error - Error object
 */
const handleError = (ctx, error) => {
	console.error({ error });
	ctx.status = error.status || 500;
	ctx.body = { error: error.message };
};

/**
 * Handle zelfPay logic for searchTag functions
 * @param {Object} data - Search result data
 * @param {Object} user - User object
 * @param {string} domain - Domain name
 * @returns {Object|null} - ZelfPay object or null
 */
const handleZelfPayLogic = async (data, user, domain = "zelf") => {
	if (!data || !data.available || !data.tagName?.includes("zelfpay")) {
		return null;
	}

	const tagName = data.tagName.replace("zelfpay", domain);
	const tagData = await Module.searchTag({ tagName, domain }, user);
	const tagObject = tagData.ipfs?.length ? tagData.ipfs[0] : tagData.arweave[0];

	if (tagObject) {
		return await Module.createZelfPay(tagObject, user, domain);
	}

	return null;
};

/**
 * Handle old tag object updates
 * @param {Object} data - Search result data
 * @param {string} domain - Domain name
 * @returns {Object} - Updated data
 */
const handleOldTagUpdate = async (data, domain = "zelf") => {
	if (data && data.ipfs?.length) {
		const tagObject = data.ipfs[0];

		if (!tagObject.publicData.registeredAt) {
			const updatedTagObject = await updateOldTagObject(tagObject, domain);
			data.ipfs[0] = updatedTagObject;
		}
	}

	return data;
};

/**
 * Search for a tag (v2)
 * @param {Object} ctx - Koa context
 * @returns {Object} - Search results
 */
const searchTag = async (ctx) => {
	try {
		const { extractedDomain, extractedName } = ctx.state;

		// Add domain context to request
		const requestData = {
			...ctx.request.query,
			tagName: extractedName ? `${extractedName}.${extractedDomain}` : ctx.request.query.tagName,
			domain: extractedDomain || ctx.request.query.domain,
			environment: ctx.request.query.environment,
			type: ctx.request.query.type || "both",
		};

		let data = await Module.searchTag(requestData, ctx.state.user);

		// Handle zelfPay logic
		const zelfPayResult = await handleZelfPayLogic(data, ctx.state.user, extractedDomain);

		// If zelfPay result is found, return it
		if (zelfPayResult) {
			ctx.body = { data: zelfPayResult };
			return;
		}

		ctx.body = { data };
	} catch (error) {
		handleError(ctx, error);
	}
};

/**
 * Search for a tag (v2)
 * @param {Object} ctx - Koa context
 * @returns {Object} - Search results
 */
const searchTagsByDomain = async (ctx) => {
	try {
		const { domain, storage } = ctx.request.query;

		let data = await TagsSearchModule.searchByDomain({ domain, storage }, ctx.state.user);

		ctx.body = { data };
	} catch (error) {
		const _exception = HttpHandler.errorHandler(error, ctx);

		ctx.status = _exception.status;

		ctx.body = {
			message: _exception.message,
			code: _exception.code,
		};
	}
};

/**
 * Lease a tag (v2)
 * @param {Object} ctx - Koa context
 * @returns {Object} - Lease results
 */
const leaseTag = async (ctx) => {
	try {
		const { extractedDomain, extractedName } = ctx.state;

		const requestData = {
			...ctx.request.body,
			tagName: extractedName ? `${extractedName}.${extractedDomain}` : ctx.request.body.tagName,
			domain: extractedDomain,
		};

		const data = await Module.leaseTag(requestData, ctx.state.user);

		ctx.body = { data };
	} catch (error) {
		const _exception = HttpHandler.errorHandler(error, ctx);

		ctx.status = _exception.status;

		ctx.body = { message: _exception.message, code: _exception.code };
	}
};

/**
 * Lease recovery for tags
 * @param {Object} ctx - Koa context
 * @returns {Object} - Recovery results
 */
const leaseRecovery = async (ctx) => {
	try {
		const { extractedDomain, extractedName } = ctx.state;

		const requestData = {
			...ctx.request.body,
			tagName: extractedName ? `${extractedName}.${extractedDomain}` : ctx.request.body.tagName,
			domain: extractedDomain,
		};

		const data = await TagsRecoveryModule.leaseRecovery(requestData, ctx.state.user);

		ctx.body = { data };
	} catch (error) {
		const _exception = HttpHandler.errorHandler(error, ctx);

		ctx.status = _exception.status;
		ctx.body = { message: _exception.message, code: _exception.code };
	}
};

/**
 * Lease tag offline (v2)
 * @param {Object} ctx - Koa context
 * @returns {Object} - Offline lease results
 */
const leaseOfflineTag = async (ctx) => {
	try {
		const { extractedDomain, extractedName } = ctx.state;

		const requestData = {
			...ctx.request.body,
			tagName: extractedName ? `${extractedName}.${extractedDomain}` : ctx.request.body.tagName,
			domain: extractedDomain,
		};

		const data = await TagsOfflineModule.leaseOfflineTag(requestData, ctx.state.user);

		ctx.body = { data };
	} catch (error) {
		handleError(ctx, error);
	}
};

/**
 * Lease confirmation for tags (v2)
 * @param {Object} ctx - Koa context
 * @returns {Object} - Confirmation results
 */
const leaseConfirmation = async (ctx) => {
	try {
		const { extractedDomain, extractedName } = ctx.state;

		const requestData = {
			...ctx.request.body,
			tagName: extractedName ? `${extractedName}.${extractedDomain}` : ctx.request.body.tagName,
			domain: extractedDomain,
		};

		const data = await Module.leaseConfirmation(requestData, ctx.state.user);

		ctx.body = { data };
	} catch (error) {
		const _exception = HttpHandler.errorHandler(error, ctx);

		ctx.status = _exception.status;
		ctx.body = { message: _exception.message, code: _exception.code };
	}
};

/**
 * Preview tag (v2)
 * @param {Object} ctx - Koa context
 * @returns {Object} - Preview results
 */
const previewTag = async (ctx) => {
	try {
		const { extractedDomain, extractedName } = ctx.state;

		const requestData = {
			...ctx.request.body,
			tagName: extractedName ? `${extractedName}.${extractedDomain}` : ctx.request.body.tagName,
			domain: extractedDomain,
		};

		const data = await Module.previewTag(requestData, ctx.state.user);

		ctx.body = { data };
	} catch (error) {
		const _exception = HttpHandler.errorHandler(error, ctx);

		ctx.status = _exception.status;
		ctx.body = { message: _exception.message, code: _exception.code };
	}
};

/**
 * Preview ZelfProof
 * @param {Object} ctx - Koa context
 * @returns {Object} - Preview results
 */
const previewZelfProof = async (ctx) => {
	try {
		const data = await Module.previewZelfProof(ctx.request.body, ctx.state.user);

		ctx.body = { data };
	} catch (error) {
		const _exception = HttpHandler.errorHandler(error, ctx);

		ctx.status = _exception.status;
		ctx.body = { message: _exception.message, code: _exception.code };
	}
};

/**
 * Decrypt tag (v2)
 * @param {Object} ctx - Koa context
 * @returns {Object} - Decrypt results
 */
const decryptTag = async (ctx) => {
	try {
		const { extractedDomain, extractedName } = ctx.state;

		const requestData = {
			...ctx.request.body,
			tagName: extractedName ? `${extractedName}.${extractedDomain}` : ctx.request.body.tagName,
			domain: extractedDomain,
		};

		const data = await Module.decryptTag(requestData, ctx.state.user);

		ctx.body = { data };
	} catch (error) {
		const _exception = HttpHandler.errorHandler(error, ctx);

		ctx.status = _exception.status;
		ctx.body = { message: _exception.message, code: _exception.code };
	}
};

/**
 * RevenueCat webhook
 * @param {Object} ctx - Koa context
 * @returns {Object} - Webhook results
 */
const revenueCatWebhook = async (ctx) => {
	try {
		const data = await RevenueCatModule.revenueCatWebhook(ctx.request.body);

		ctx.body = { data };
	} catch (error) {
		handleError(ctx, error);
	}
};

/**
 * Purchase rewards
 * @param {Object} ctx - Koa context
 * @returns {Object} - Rewards results
 */
const purchaseRewards = async (ctx) => {
	try {
		const data = await RevenueCatModule.purchaseRewards(ctx.request.body);

		ctx.body = { data };
	} catch (error) {
		const _exception = HttpHandler.errorHandler(error, ctx);

		ctx.status = _exception.status;
		ctx.body = { message: _exception.message, code: _exception.code };
	}
};

/**
 * Referral rewards
 * @param {Object} ctx - Koa context
 * @returns {Object} - Rewards results
 */
const referralRewards = async (ctx) => {
	try {
		const data = await RevenueCatModule.referralRewards(ctx.request.body);

		ctx.body = { data };
	} catch (error) {
		const _exception = HttpHandler.errorHandler(error, ctx);

		ctx.status = _exception.status;
		ctx.body = { message: _exception.message, code: _exception.code };
	}
};

/**
 * Delete tag from IPFS
 * @param {Object} ctx - Koa context
 * @returns {Object} - Delete result
 */
const deleteTag = async (ctx) => {
	try {
		const { cid, faceBase64, password, tagName, domain } = ctx.request.body;

		const result = await Module.deleteTag({ cid, faceBase64, password, tagName, domain }, ctx.state.user);

		ctx.body = { data: result };
	} catch (error) {
		handleError(ctx, error);
	}
};

module.exports = {
	searchTag,
	searchTagsByDomain,
	leaseTag,
	leaseRecovery,
	leaseOfflineTag,
	leaseConfirmation,
	previewTag,
	previewZelfProof,
	decryptTag,
	revenueCatWebhook,
	purchaseRewards,
	referralRewards,
	deleteTag,
	// Utility functions
	handleZelfPayLogic,
	handleOldTagUpdate,
};
