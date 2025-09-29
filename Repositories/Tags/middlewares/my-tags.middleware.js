const { string, validate, boolean, number, stringEnum } = require("../../../Core/JoiUtils");
const Session = require("../../Session/models/session.model");
const moment = require("moment");
const { extractDomainAndName, validateDomainAndName } = require("./tags.middleware");
const jwt = require("jsonwebtoken");
const config = require("../../../Core/config");

const schemas = {
	transfer: {
		tagName: string().required(),
		domain: string(),
		faceBase64: string().required(),
		password: string().required(),
	},
	paymentConfirmation: {
		tagName: string().required(),
		domain: string(),
		network: string().required(),
		token: string().required(),
	},
	paymentOptions: {
		tagName: string().required(),
		domain: string(),
		duration: stringEnum(["1", "2", "3", "4", "5", "lifetime"]).required(),
	},
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
 * Payment Options Validation - Multi-domain support
 * @param {*} ctx - Koa context
 * @param {*} next - Next middleware
 */
const paymentOptionsValidation = async (ctx, next) => {
	const valid = validate(schemas.paymentOptions, ctx.request.query);

	if (valid.error) {
		ctx.status = 409;

		ctx.body = { validationError: valid.error.message };

		return;
	}

	const { tagName, domain } = ctx.request.query;

	const domainValidation = await validateDomainAndName(domain, tagName);

	if (!domainValidation.valid) {
		ctx.status = 409;
		ctx.body = { validationError: domainValidation.error };
		return;
	}

	await next();
};

/**
 * Payment Confirmation Validation - Multi-domain support
 * @param {*} ctx - Koa context
 * @param {*} next - Next middleware
 */
const paymentConfirmationValidation = async (ctx, next) => {
	const valid = validate(schemas.paymentConfirmation, ctx.request.body);

	if (valid.error) {
		ctx.status = 409;
		ctx.body = { validationError: valid.error.message };
		return;
	}

	const { tagName, domain, token } = ctx.request.body;

	const domainValidation = await validateDomainAndName(domain, tagName);

	if (!domainValidation.valid) {
		ctx.status = 409;
		ctx.body = { validationError: domainValidation.error };
		return;
	}

	// now also validate the token is valid that we encrypted with jwt
	const tokenDecoded = jwt.verify(token, config.JWT_SECRET);

	if (!tokenDecoded) {
		ctx.status = 409;
		ctx.body = { validationError: "invalid_token" };
		return;
	}

	// now validate tokenDecoded.ttl is still valid
	// TEMPORARY: Simulate 2 hours in the future for testing
	//.add(2, "hours")
	const now = moment().unix();

	if (tokenDecoded.ttl < now) {
		ctx.status = 409;
		ctx.body = { validationError: "token_expired" };
		return;
	}

	await next();
};

module.exports = {
	transferValidation,
	paymentOptionsValidation,
	paymentConfirmationValidation,
};
