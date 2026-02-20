const LawyerModule = require("../modules/lawyer.module");
const { errorHandler } = require("../../../Core/http-handler");

let ERC8004LawyerModule;
try {
	ERC8004LawyerModule = require("../modules/erc8004-lawyer.module");
} catch (e) {
	console.warn("ERC8004 Lawyer module not loaded:", e.message);
}

/**
 * Get lawyers for domain (admin)
 */
const get = async (ctx) => {
	try {
		const data = await LawyerModule.get(ctx.request.query, ctx.state.user);
		ctx.body = { data };
	} catch (error) {
		const _exception = errorHandler(error, ctx);
		ctx.status = _exception.status || 500;
		ctx.body = { code: _exception.code, message: _exception.message };
	}
};

/**
 * Get current lawyer profile
 */
const getMyProfile = async (ctx) => {
	try {
		const data = await LawyerModule.getMyProfile(ctx.state.user);
		ctx.body = { data };
	} catch (error) {
		const _exception = errorHandler(error, ctx);
		ctx.status = _exception.status || 500;
		ctx.body = { code: _exception.code, message: _exception.message };
	}
};

/**
 * Generate lawyer invitation
 */
const generateInvitation = async (ctx) => {
	try {
		const data = await LawyerModule.generateInvitation(ctx.request.body, ctx.state.user);
		ctx.body = { data };
	} catch (error) {
		const _exception = errorHandler(error, ctx);
		ctx.status = _exception.status || 500;
		ctx.body = { code: _exception.code, message: _exception.message };
	}
};

/**
 * Update lawyer profile
 */
const updateProfile = async (ctx) => {
	try {
		const data = await LawyerModule.updateProfile(ctx.request.body, ctx.state.user);
		ctx.body = { data };
	} catch (error) {
		const _exception = errorHandler(error, ctx);
		ctx.status = _exception.status || 500;
		ctx.body = { code: _exception.code, message: _exception.message };
	}
};

/**
 * Set preferred lawyers
 */
const setPreferred = async (ctx) => {
	try {
		const data = await LawyerModule.setPreferred(ctx.request.body, ctx.state.user);
		ctx.body = { data };
	} catch (error) {
		const _exception = errorHandler(error, ctx);
		ctx.status = _exception.status || 500;
		ctx.body = { code: _exception.code, message: _exception.message };
	}
};

/**
 * Get preferred lawyers
 */
const getPreferred = async (ctx) => {
	try {
		const data = await LawyerModule.getPreferred(ctx.request.query, ctx.state.user);
		ctx.body = { data };
	} catch (error) {
		const _exception = errorHandler(error, ctx);
		ctx.status = _exception.status || 500;
		ctx.body = { code: _exception.code, message: _exception.message };
	}
};

/**
 * Remove lawyer
 */
const remove = async (ctx) => {
	try {
		const data = await LawyerModule.remove(ctx.request.body, ctx.state.user);
		ctx.body = { data };
	} catch (error) {
		const _exception = errorHandler(error, ctx);
		ctx.status = _exception.status || 500;
		ctx.body = { code: _exception.code, message: _exception.message };
	}
};

/**
 * Register lawyer on ERC8004 Identity Registry
 */
const registerIdentity = async (ctx) => {
	try {
		if (!ERC8004LawyerModule) throw new Error("500:erc8004_module_not_available");

		const data = await ERC8004LawyerModule.registerLawyer(ctx.request.body, ctx.state.user);
		ctx.body = { data };
	} catch (error) {
		const _exception = errorHandler(error, ctx);
		ctx.status = _exception.status || 500;
		ctx.body = { code: _exception.code, message: _exception.message };
	}
};

/**
 * Submit review for a lawyer (ERC8004 Reputation)
 */
const submitReview = async (ctx) => {
	try {
		if (!ERC8004LawyerModule) throw new Error("500:erc8004_module_not_available");

		const data = await ERC8004LawyerModule.submitFeedback(ctx.request.body, ctx.state.user);
		ctx.body = { data };
	} catch (error) {
		const _exception = errorHandler(error, ctx);
		ctx.status = _exception.status || 500;
		ctx.body = { code: _exception.code, message: _exception.message };
	}
};

/**
 * Get lawyer reputation (ERC8004)
 */
const getReputation = async (ctx) => {
	try {
		if (!ERC8004LawyerModule) throw new Error("500:erc8004_module_not_available");

		const { walletAddress } = ctx.request.query;
		if (!walletAddress) throw new Error("400:missing_wallet_address");

		const data = await ERC8004LawyerModule.getReputationSummary(walletAddress);
		ctx.body = { data };
	} catch (error) {
		const _exception = errorHandler(error, ctx);
		ctx.status = _exception.status || 500;
		ctx.body = { code: _exception.code, message: _exception.message };
	}
};

/**
 * Get pending invitations
 */
const getInvitations = async (ctx) => {
	try {
		const data = await LawyerModule.getInvitations(ctx.request.query, ctx.state.user);
		ctx.body = { data };
	} catch (error) {
		const _exception = errorHandler(error, ctx);
		ctx.status = _exception.status || 500;
		ctx.body = { code: _exception.code, message: _exception.message };
	}
};

/**
 * Get lawyers + invitations combined
 */
const getAll = async (ctx) => {
	try {
		const data = await LawyerModule.getAll(ctx.request.query, ctx.state.user);
		ctx.body = { data };
	} catch (error) {
		const _exception = errorHandler(error, ctx);
		ctx.status = _exception.status || 500;
		ctx.body = { code: _exception.code, message: _exception.message };
	}
};

module.exports = {
	get,
	getAll,
	getMyProfile,
	generateInvitation,
	updateProfile,
	setPreferred,
	getPreferred,
	getInvitations,
	remove,
	registerIdentity,
	submitReview,
	getReputation,
};
