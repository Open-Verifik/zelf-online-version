const LawyerModule = require("../modules/lawyer.module");
const { errorHandler } = require("../../../Core/http-handler");

let ERC8004LawyerModule;
try {
	ERC8004LawyerModule = require("../modules/erc8004-lawyer.module");
} catch (e) {
	console.warn("ERC8004 Lawyer module not loaded:", e.message);
}

/**
 * Search lawyers (public)
 */
const search = async (ctx) => {
	try {
		const data = await LawyerModule.search(ctx.request.query);
		ctx.body = { data };
	} catch (error) {
		const _exception = errorHandler(error, ctx);
		ctx.status = _exception.status || 500;
		ctx.body = { code: _exception.code, message: _exception.message };
	}
};

/**
 * Get lawyer by zelfName (public)
 */
const getByZelfName = async (ctx) => {
	try {
		const { zelfName } = ctx.params;
		if (!zelfName) throw new Error("400:missing_zelf_name");

		const data = await LawyerModule.getByZelfName(zelfName);
		if (!data) throw new Error("404:lawyer_not_found");

		ctx.body = { data };
	} catch (error) {
		const _exception = errorHandler(error, ctx);
		ctx.status = _exception.status || 500;
		ctx.body = { code: _exception.code, message: _exception.message };
	}
};

/**
 * Validate invitation token (public)
 */
const validateInvitation = async (ctx) => {
	try {
		const { token } = ctx.request.query;
		if (!token) throw new Error("400:missing_token");

		const data = await LawyerModule.validateInvitation(token);
		ctx.body = { data };
	} catch (error) {
		const _exception = errorHandler(error, ctx);
		ctx.status = _exception.status || 500;
		ctx.body = { code: _exception.code, message: _exception.message };
	}
};

/**
 * Create lawyer from invitation (public)
 */
const createFromInvitation = async (ctx) => {
	try {
		const data = await LawyerModule.createFromInvitation(ctx.request.body);
		ctx.body = { data };
	} catch (error) {
		const _exception = errorHandler(error, ctx);
		ctx.status = _exception.status || 500;
		ctx.body = { code: _exception.code, message: _exception.message };
	}
};

/**
 * Authenticate lawyer (public)
 */
const auth = async (ctx) => {
	try {
		const data = await LawyerModule.auth(ctx.request.body);
		ctx.body = { data };
	} catch (error) {
		const _exception = errorHandler(error, ctx);
		ctx.status = _exception.status || 500;
		ctx.body = { code: _exception.code, message: _exception.message };
	}
};

/**
 * Get lawyer reputation (public)
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

module.exports = {
	search,
	getByZelfName,
	validateInvitation,
	createFromInvitation,
	auth,
	getReputation,
};
