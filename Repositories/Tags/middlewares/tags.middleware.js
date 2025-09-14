const { string, validate, boolean, number, stringEnum } = require("../../../Core/JoiUtils");
const captchaService = require("../../../Core/captcha");
const config = require("../../../Core/config");
const Session = require("../../Session/models/session.model");
const { getDomainConfiguration, validateDomainName, isDomainActive } = require("../modules/domain-registry.module");

const schemas = {
	search: {
		tagName: string(),
		domain: string(),
		key: string(),
		value: string(),
		os: stringEnum(["DESKTOP", "ANDROID", "IOS"]),
		captchaToken: string(),
	},
	leaseOffline: {
		tagName: string().required(),
		domain: string().required(),
		zelfProof: string().required(),
		zelfProofQRCode: string().required(),
	},
	leaseConfirmation: {
		tagName: string().required(),
		domain: string().required(),
		coin: string().required(),
		network: stringEnum(["coinbase", "CB", "ETH", "SOL", "BTC"]).required(),
	},
	lease: {
		tagName: string().required(),
		domain: string().required(),
		faceBase64: string().required(),
		type: stringEnum(["create", "import"]).required(),
		os: stringEnum(["DESKTOP", "ANDROID", "IOS"]).required(),
		captchaToken: string(),
	},
	leaseRecovery: {
		zelfProof: string().required(),
		tagName: string().required(),
		domain: string().required(),
		faceBase64: string().required(),
		password: string().required(),
		os: stringEnum(["DESKTOP", "ANDROID", "IOS"]).required(),
		captchaToken: string(),
	},
	decrypt: {
		faceBase64: string().required(),
		password: string(),
		tagName: string().required(),
		domain: string().required(),
		addServerPassword: boolean(),
		os: stringEnum(["DESKTOP", "ANDROID", "IOS"]).required(),
		captchaToken: string(),
	},
	preview: {
		tagName: string().required(),
		domain: string().required(),
		os: stringEnum(["DESKTOP", "ANDROID", "IOS"]).required(),
		captchaToken: string(),
	},
	previewZelfProof: {
		zelfProof: string().required(),
		os: stringEnum(["DESKTOP", "ANDROID", "IOS"]).required(),
		captchaToken: string(),
	},
	revenueCatWebhook: {
		event: {
			product_id: string().required(),
			period_type: string().required(),
			currency: string().required(),
			price: number().required(),
			id: string().required(),
			app_id: string().required(),
			transaction_id: string().required(),
			environment: string().required(),
		},
	},
	referralRewards: {},
	purchaseRewards: {},
	update: {
		duration: stringEnum(["1", "2", "3", "4", "5", "lifetime"]).required(),
	},
};

/**
 * Extract domain from tag name or use provided domain parameter
 * @param {string} tagName - Full tag name (e.g., "username.avax")
 * @param {string} domain - Domain parameter from request
 * @returns {Object} - { domain, name }
 */
const extractDomainAndName = (tagName, domain) => {
	if (!tagName) return { domain: null, name: null };

	// If domain is provided, use it
	if (domain) {
		const name = tagName.replace(`.${domain}`, "");
		return { domain: domain.toLowerCase(), name };
	}

	// Extract domain from tag name
	const parts = tagName.split(".");
	if (parts.length >= 2) {
		const extractedDomain = parts[parts.length - 1].toLowerCase();
		const name = parts.slice(0, -1).join(".");
		return { domain: extractedDomain, name };
	}

	// Default to zelf domain if no domain specified
	return { domain: "zelf", name: tagName };
};

/**
 * Validate domain and tag name
 * @param {string} domain - Domain name
 * @param {string} name - Tag name without domain
 * @returns {Object} - Validation result
 */
const validateDomainAndName = async (domain, name) => {
	if (!domain) return { valid: false, error: "Domain is required" };

	// Check if domain is active
	const isActive = await isDomainActive(domain);

	if (!isActive) return { valid: false, error: `Domain '${domain}' is not supported or inactive` };

	// Validate name against domain rules
	if (name) {
		const nameValidation = await validateDomainName(domain, name);
		if (!nameValidation.valid) {
			return nameValidation;
		}
	}

	return { valid: true };
};

/**
 * Get Validation - Multi-domain support
 * @param {*} ctx - Koa context
 * @param {*} next - Next middleware
 */
const getValidation = async (ctx, next) => {
	const { tagName, domain, key, value, captchaToken, os } = ctx.request.query;

	const valid = validate(schemas.search, {
		tagName,
		domain,
		key,
		value,
		captchaToken,
		os,
	});

	const authUser = ctx.state.user;

	if (authUser.session) {
		// we will now check if the session is active
		const session = await Session.findOne({ _id: authUser.session });

		if (session?.status !== "active" || !session?.clientIP) {
			ctx.status = 403;
			ctx.body = { validationError: "Session is not active" };
			return;
		}

		if (session.searchCount >= config.sessions.searchLimit) {
			ctx.status = 403;
			ctx.body = { validationError: "Search limit exceeded" };
			return;
		}

		// then after is that we will increment searchCount
		await Session.updateOne({ _id: authUser.session }, { $inc: { searchCount: 1 } });
	}

	if (valid.error) {
		ctx.status = 409;
		ctx.body = { validationError: valid.error.message };
		return;
	}

	// Validate domain and tag name if provided
	if (tagName) {
		const { domain: extractedDomain, name } = extractDomainAndName(tagName, domain);
		const domainValidation = await validateDomainAndName(extractedDomain, name);

		if (!domainValidation.valid) {
			ctx.status = 409;
			ctx.body = { validationError: domainValidation.error };
			return;
		}

		// Add extracted domain and name to context for use in controllers
		ctx.state.extractedDomain = extractedDomain;
		ctx.state.extractedName = name;
	}

	// Captcha validation
	if (captchaToken) {
		const captchaResult = await captchaService.verifyCaptcha(captchaToken);

		if (!captchaResult.success) {
			ctx.status = 409;
			ctx.body = {
				captchaScore: captchaResult.score,
				validationError: "Captcha not acceptable",
			};
			return;
		}
	}

	await next();
};

/**
 * Lease Validation - Multi-domain support
 * @param {*} ctx - Koa context
 * @param {*} next - Next middleware
 */
const leaseValidation = async (ctx, next) => {
	const { tagName, domain, faceBase64, type, os, captchaToken } = ctx.request.body;

	const valid = validate(schemas.lease, {
		tagName,
		domain,
		faceBase64,
		type,
		os,
		captchaToken,
	});

	const authUser = ctx.state.user;

	if (authUser.session) {
		const session = await Session.findOne({ _id: authUser.session });

		if (session?.status !== "active" || !session?.clientIP) {
			ctx.status = 403;
			ctx.body = { validationError: "Session is not active" };
			return;
		}

		if (session.leaseCount >= config.sessions.leaseLimit) {
			ctx.status = 403;
			ctx.body = { validationError: "Lease limit exceeded" };
			return;
		}

		await Session.updateOne({ _id: authUser.session }, { $inc: { leaseCount: 1 } });
	}

	if (valid.error) {
		ctx.status = 409;
		ctx.body = { validationError: valid.error.message };
		return;
	}

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

	// Captcha validation
	if (captchaToken) {
		const captchaResult = await captchaService.verifyCaptcha(captchaToken);

		if (!captchaResult.success) {
			ctx.status = 409;
			ctx.body = {
				captchaScore: captchaResult.score,
				validationError: "Captcha not acceptable",
			};
			return;
		}
	}

	await next();
};

/**
 * Lease Recovery Validation - Multi-domain support
 * @param {*} ctx - Koa context
 * @param {*} next - Next middleware
 */
const leaseRecoveryValidation = async (ctx, next) => {
	const { zelfProof, tagName, domain, faceBase64, password, os, captchaToken } = ctx.request.body;

	const valid = validate(schemas.leaseRecovery, {
		zelfProof,
		tagName,
		domain,
		faceBase64,
		password,
		os,
		captchaToken,
	});

	if (valid.error) {
		ctx.status = 409;
		ctx.body = { validationError: valid.error.message };
		return;
	}

	const authUser = ctx.state.user;

	if (authUser.session) {
		const session = await Session.findOne({ _id: authUser.session });

		if (session?.status !== "active" || !session?.clientIP) {
			ctx.status = 403;
			ctx.body = { validationError: "Session is not active" };
			return;
		}

		if (session.leaseCount >= config.sessions.leaseLimit) {
			ctx.status = 403;
			ctx.body = { validationError: "Lease limit exceeded" };
			return;
		}

		await Session.updateOne({ _id: authUser.session }, { $inc: { leaseCount: 1 } });
	}

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

	// Captcha validation
	if (captchaToken) {
		const captchaResult = await captchaService.verifyCaptcha(captchaToken);

		if (!captchaResult.success) {
			ctx.status = 409;
			ctx.body = {
				captchaScore: captchaResult.score,
				validationError: "Captcha not acceptable",
			};
			return;
		}
	}

	await next();
};

/**
 * Lease Offline Validation - Multi-domain support
 * @param {*} ctx - Koa context
 * @param {*} next - Next middleware
 */
const leaseOfflineValidation = async (ctx, next) => {
	const { tagName, domain, zelfProof, zelfProofQRCode } = ctx.request.body;

	const valid = validate(schemas.leaseOffline, {
		tagName,
		domain,
		zelfProof,
		zelfProofQRCode,
	});

	if (valid.error) {
		ctx.status = 409;
		ctx.body = { validationError: valid.error.message };
		return;
	}

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
 * Lease Confirmation Validation - Multi-domain support
 * @param {*} ctx - Koa context
 * @param {*} next - Next middleware
 */
const leaseConfirmationValidation = async (ctx, next) => {
	const payload = Object.assign(ctx.request.query, ctx.request.body);

	const { tagName, domain, coin, network } = payload;

	const valid = validate(schemas.leaseConfirmation, {
		tagName,
		domain,
		coin,
		network,
	});

	if (valid.error) {
		ctx.status = 409;
		ctx.body = { validationError: valid.error.message };
		return;
	}

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
 * Preview Validation - Multi-domain support
 * @param {*} ctx - Koa context
 * @param {*} next - Next middleware
 */
const previewValidation = async (ctx, next) => {
	const payload = Object.assign(ctx.request.query, ctx.request.body);

	const { tagName, domain, os, captchaToken } = payload;

	const valid = validate(schemas.preview, {
		tagName,
		domain,
		os,
		captchaToken,
	});

	const authUser = ctx.state.user;

	if (authUser.session) {
		const session = await Session.findOne({ _id: authUser.session });

		if (session?.status !== "active" || !session?.clientIP) {
			ctx.status = 403;
			ctx.body = { validationError: "Session is not active" };
			return;
		}

		if (session.previewCount >= config.sessions.previewLimit) {
			ctx.status = 403;
			ctx.body = { validationError: "Preview limit exceeded" };
			return;
		}

		await Session.updateOne({ _id: authUser.session }, { $inc: { previewCount: 1 } });
	}

	if (valid.error) {
		ctx.status = 409;
		ctx.body = { validationError: valid.error.message };
		return;
	}

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

	// Captcha validation
	if (captchaToken) {
		const captchaResult = await captchaService.verifyCaptcha(captchaToken);

		if (!captchaResult.success) {
			ctx.status = 409;
			ctx.body = {
				captchaScore: captchaResult.score,
				validationError: "Captcha not acceptable",
			};
			return;
		}
	}

	await next();
};

/**
 * Preview ZelfProof Validation
 * @param {*} ctx - Koa context
 * @param {*} next - Next middleware
 */
const previewZelfProofValidation = async (ctx, next) => {
	const { zelfProof, os, captchaToken } = ctx.request.body;

	const valid = validate(schemas.previewZelfProof, {
		zelfProof,
		os,
		captchaToken,
	});

	const authUser = ctx.state.user;

	if (authUser.session) {
		const session = await Session.findOne({ _id: authUser.session });

		if (session?.status !== "active" || !session?.clientIP) {
			ctx.status = 403;
			ctx.body = { validationError: "Session is not active" };
			return;
		}

		if (session.previewCount >= config.sessions.previewLimit) {
			ctx.status = 403;
			ctx.body = { validationError: "Preview limit exceeded" };
			return;
		}

		await Session.updateOne({ _id: authUser.session }, { $inc: { previewCount: 1 } });
	}

	if (valid.error) {
		ctx.status = 409;
		ctx.body = { validationError: valid.error.message };
		return;
	}

	// Captcha validation
	if (captchaToken) {
		const captchaResult = await captchaService.verifyCaptcha(captchaToken);

		if (!captchaResult.success) {
			ctx.status = 409;
			ctx.body = {
				captchaScore: captchaResult.score,
				validationError: "Captcha not acceptable",
			};
			return;
		}
	}

	await next();
};

/**
 * Decrypt Validation - Multi-domain support
 * @param {*} ctx - Koa context
 * @param {*} next - Next middleware
 */
const decryptValidation = async (ctx, next) => {
	const { faceBase64, password, tagName, domain, addServerPassword, os, captchaToken } = ctx.request.body;

	const valid = validate(schemas.decrypt, {
		faceBase64,
		password,
		tagName,
		domain,
		addServerPassword,
		os,
		captchaToken,
	});

	const authUser = ctx.state.user;

	if (authUser.session) {
		const session = await Session.findOne({ _id: authUser.session });

		if (session?.status !== "active" || !session?.clientIP) {
			ctx.status = 403;
			ctx.body = { validationError: "Session is not active" };
			return;
		}

		if (session.decryptCount >= config.sessions.decryptLimit) {
			ctx.status = 403;
			ctx.body = { validationError: "Decrypt limit exceeded" };
			return;
		}

		await Session.updateOne({ _id: authUser.session }, { $inc: { decryptCount: 1 } });
	}

	if (valid.error) {
		ctx.status = 409;
		ctx.body = { validationError: valid.error.message };
		return;
	}

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

	// Captcha validation
	if (captchaToken) {
		const captchaResult = await captchaService.verifyCaptcha(captchaToken);

		if (!captchaResult.success) {
			ctx.status = 409;
			ctx.body = {
				captchaScore: captchaResult.score,
				validationError: "Captcha not acceptable",
			};
			return;
		}
	}

	await next();
};

/**
 * RevenueCat Webhook Validation
 * @param {*} ctx - Koa context
 * @param {*} next - Next middleware
 */
const revenueCatWebhookValidation = async (ctx, next) => {
	const payload = Object.assign(ctx.request.query, ctx.request.body);

	const { event } = payload;

	const valid = validate(schemas.revenueCatWebhook, {
		event,
	});

	if (valid.error) {
		ctx.status = 409;
		ctx.body = { validationError: valid.error.message };
		return;
	}

	if (!event) {
		ctx.status = 409;
		ctx.body = { validationError: "Missing event payload" };
		return;
	}

	await next();
};

/**
 * Referral Rewards Validation
 * @param {*} ctx - Koa context
 * @param {*} next - Next middleware
 */
const referralRewardsValidation = async (ctx, next) => {
	const payload = Object.assign(ctx.request.query, ctx.request.body);

	const valid = validate(schemas.referralRewards, payload);

	if (valid.error) {
		ctx.status = 409;
		ctx.body = { validationError: valid.error.message };
		return;
	}

	// Check if user is super admin
	const authUser = ctx.state.user;
	if (!authUser.superAdminId) {
		ctx.status = 403;
		ctx.body = { error: "Unauthorized" };
		return;
	}

	await next();
};

/**
 * Purchase Rewards Validation
 * @param {*} ctx - Koa context
 * @param {*} next - Next middleware
 */
const purchaseRewardsValidation = async (ctx, next) => {
	const payload = Object.assign(ctx.request.query, ctx.request.body);

	const valid = validate(schemas.purchaseRewards, payload);

	if (valid.error) {
		ctx.status = 409;
		ctx.body = { validationError: valid.error.message };
		return;
	}

	// Check if user is super admin
	const authUser = ctx.state.user;
	if (!authUser.superAdminId) {
		ctx.status = 403;
		ctx.body = { error: "Unauthorized" };
		return;
	}

	await next();
};

/**
 * Update Validation - Multi-domain support
 * @param {*} ctx - Koa context
 * @param {*} next - Next middleware
 */
const updateValidation = async (ctx, next) => {
	const payload = Object.assign(ctx.request.query, ctx.request.body);

	const { duration } = payload;

	const valid = validate(schemas.update, {
		duration,
	});

	if (valid.error) {
		ctx.status = 409;
		ctx.body = { validationError: valid.error.message };
		return;
	}

	// Extract domain from tag name in URL params
	const tagName = ctx.params.tagName;
	if (tagName) {
		const { domain: extractedDomain, name } = extractDomainAndName(tagName);
		const domainValidation = await validateDomainAndName(extractedDomain, name);

		if (!domainValidation.valid) {
			ctx.status = 409;
			ctx.body = { validationError: domainValidation.error };
			return;
		}

		// Add extracted domain and name to context
		ctx.state.extractedDomain = extractedDomain;
		ctx.state.extractedName = name;
	}

	await next();
};

module.exports = {
	getValidation,
	leaseValidation,
	leaseRecoveryValidation,
	leaseOfflineValidation,
	leaseConfirmationValidation,
	previewValidation,
	previewZelfProofValidation,
	decryptValidation,
	revenueCatWebhookValidation,
	referralRewardsValidation,
	purchaseRewardsValidation,
	updateValidation,
	// Utility functions
	extractDomainAndName,
	validateDomainAndName,
};
