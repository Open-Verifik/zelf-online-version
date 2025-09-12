const { string, validate, boolean, number, stringEnum } = require("../../../Core/JoiUtils");
const Session = require("../../Session/models/session.model");
const moment = require("moment");
const { extractDomainAndName, validateDomainAndName } = require("./tags.middleware");

const schemas = {
	transfer: {
		tagName: string().required(),
		domain: string(),
		faceBase64: string().required(),
		password: string().required(),
	},
	renew: {
		tagName: string().required(),
		domain: string(),
		network: string().required(),
		token: string().required(),
	},
	howToRenew: {
		tagName: string().required(),
		domain: string(),
	},
};

/**
 * Validate tag name format
 * @param {string} tagName - Tag name to validate
 * @param {Object} ctx - Koa context
 * @returns {boolean} - True if validation failed
 */
const validateTagName = (tagName, ctx) => {
	if (!tagName) {
		ctx.status = 409;
		ctx.body = { validationError: "Tag name is required" };
		return true;
	}

	// Check if tag name contains a domain
	const parts = tagName.split(".");
	if (parts.length < 2) {
		ctx.status = 409;
		ctx.body = { validationError: "Tag name must include a domain (e.g., username.avax)" };
		return true;
	}

	// Check for valid domain format
	const domain = parts[parts.length - 1];
	const name = parts.slice(0, -1).join(".");

	if (!domain || !name) {
		ctx.status = 409;
		ctx.body = { validationError: "Invalid tag name format" };
		return true;
	}

	return false;
};

/**
 * Transfer Validation - Multi-domain support
 * @param {*} ctx - Koa context
 * @param {*} next - Next middleware
 */
const transferValidation = async (ctx, next) => {
	const valid = validate(schemas.transfer, ctx.request.body);

	if (valid.error) {
		ctx.status = 409;
		ctx.body = { validationError: valid.error.message };
		return;
	}

	const { tagName, domain } = ctx.request.body;

	const failed = validateTagName(tagName, ctx);
	if (failed) return;

	// Validate domain and tag name
	const { domain: extractedDomain, name } = extractDomainAndName(tagName, domain);
	const domainValidation = await validateDomainAndName(extractedDomain, name);

	if (!domainValidation.valid) {
		ctx.status = 409;
		ctx.body = { validationError: domainValidation.error };
		return;
	}

	// Add extracted domain and name to context
	ctx.state.extractedDomain = extractedDomain;
	ctx.state.extractedName = name;

	await next();
};

/**
 * How to Renew Validation - Multi-domain support
 * @param {*} ctx - Koa context
 * @param {*} next - Next middleware
 */
const howToRenewValidation = async (ctx, next) => {
	const valid = validate(schemas.howToRenew, {
		...ctx.request.query,
		...ctx.request.params,
	});

	if (valid.error) {
		ctx.status = 409;
		ctx.body = { validationError: valid.error.message };
		return;
	}

	const { tagName, domain } = { ...ctx.request.query, ...ctx.request.params };

	const failed = validateTagName(tagName, ctx);
	if (failed) return;

	// Validate domain and tag name
	const { domain: extractedDomain, name } = extractDomainAndName(tagName, domain);
	const domainValidation = await validateDomainAndName(extractedDomain, name);

	if (!domainValidation.valid) {
		ctx.status = 409;
		ctx.body = { validationError: domainValidation.error };
		return;
	}

	// Add extracted domain and name to context
	ctx.state.extractedDomain = extractedDomain;
	ctx.state.extractedName = name;

	await next();
};

/**
 * Renew Validation - Multi-domain support
 * @param {*} ctx - Koa context
 * @param {*} next - Next middleware
 */
const renewValidation = async (ctx, next) => {
	const valid = validate(schemas.renew, ctx.request.body);

	if (valid.error) {
		ctx.status = 409;
		ctx.body = { validationError: valid.error.message };
		return;
	}

	const { tagName, domain } = ctx.request.body;

	const failed = validateTagName(tagName, ctx);
	if (failed) return;

	// Validate domain and tag name
	const { domain: extractedDomain, name } = extractDomainAndName(tagName, domain);
	const domainValidation = await validateDomainAndName(extractedDomain, name);

	if (!domainValidation.valid) {
		ctx.status = 409;
		ctx.body = { validationError: domainValidation.error };
		return;
	}

	// Add extracted domain and name to context
	ctx.state.extractedDomain = extractedDomain;
	ctx.state.extractedName = name;

	await next();
};

module.exports = {
	transferValidation,
	howToRenewValidation,
	renewValidation,
	validateTagName,
};
