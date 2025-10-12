const {
	getDomainConfiguration,
	isDomainSupported,
	isDomainActive,
	validateDomainName,
	getDomainLimits,
	supportsFeature,
} = require("./domain-registry.module");

/**
 * Tags Validation Module
 *
 * This module provides comprehensive validation for the Tags system.
 * It handles domain validation, name validation, feature validation, and limits checking.
 */

/**
 * Validate tag name format
 * @param {string} tagName - Full tag name (e.g., "username.avax")
 * @returns {Object} - Validation result
 */
const validateTagNameFormat = (tagName) => {
	if (!tagName || typeof tagName !== "string") {
		return { valid: false, error: "Tag name is required" };
	}

	// Check if tag name contains a domain
	const parts = tagName.split(".");
	if (parts.length < 2) {
		return { valid: false, error: "Tag name must include a domain (e.g., username.avax)" };
	}

	// Extract domain and name
	const domain = parts[parts.length - 1].toLowerCase();

	const name = parts.slice(0, -1).join(".");

	// Check if domain is supported
	if (!isDomainSupported(domain)) {
		return { valid: false, error: `Domain '${domain}' is not supported` };
	}

	// Check if domain is active
	if (!isDomainActive(domain)) {
		return { valid: false, error: `Domain '${domain}' is not active` };
	}

	// Validate name against domain rules
	const nameValidation = validateDomainName(domain, name);
	if (!nameValidation.valid) {
		return nameValidation;
	}

	return {
		valid: true,
		domain,
		name,
		tagName: `${name}.${domain}`,
	};
};

/**
 * Validate domain and name combination
 * @param {string} domain - Domain name
 * @param {string} name - Tag name without domain
 * @returns {Object} - Validation result
 */
const validateDomainAndName = async (domain, name) => {
	// Check if domain is supported
	if (!isDomainSupported(domain)) {
		return { valid: false, error: `Domain '${domain}' is not supported` };
	}

	// Check if domain is active
	if (!isDomainActive(domain)) {
		return { valid: false, error: `Domain '${domain}' is not active` };
	}

	// Validate name against domain rules
	const nameValidation = await validateDomainName(domain, name);
	if (!nameValidation.valid) {
		return nameValidation;
	}

	return {
		valid: true,
		domain,
		name,
		tagName: `${name}.${domain}`,
	};
};

/**
 * Validate tag creation request
 * @param {Object} params - Creation parameters
 * @param {string} params.tagName - Tag name
 * @param {string} params.domain - Domain name
 * @param {string} params.faceBase64 - Face data
 * @param {string} params.password - Password
 * @param {Object} authUser - Authenticated user
 * @returns {Object} - Validation result
 */
const validateTagCreation = async (params, authUser) => {
	const { tagName, domain, faceBase64, password } = params;

	// Validate basic parameters
	if (!faceBase64) {
		return { valid: false, error: "Face data is required" };
	}

	if (!password) {
		return { valid: false, error: "Password is required" };
	}

	// Validate domain and name
	const domainValidation = await validateDomainAndName(domain, tagName);
	if (!domainValidation.valid) {
		return domainValidation;
	}

	// Get domain configuration
	const domainConfig = getDomainConfiguration(domain);
	if (!domainConfig) {
		return { valid: false, error: `Domain '${domain}' configuration not found` };
	}

	// Check if user has permission to create tags in this domain
	if (domainConfig.type === "enterprise" && !authUser.enterpriseAccess) {
		return { valid: false, error: "Enterprise access required for this domain" };
	}

	// Check domain limits
	const limits = getDomainLimits(domain);
	if (limits.maxTagsPerUser && authUser.tagCount >= limits.maxTagsPerUser) {
		return { valid: false, error: `Maximum ${limits.maxTagsPerUser} tags per user exceeded` };
	}

	return {
		valid: true,
		domain: domainValidation.domain,
		name: domainValidation.name,
		tagName: domainValidation.tagName,
		domainConfig,
	};
};

/**
 * Validate tag transfer request
 * @param {Object} params - Transfer parameters
 * @param {string} params.tagName - Tag name
 * @param {string} params.domain - Domain name
 * @param {string} params.faceBase64 - Face data
 * @param {string} params.password - Password
 * @param {Object} authUser - Authenticated user
 * @returns {Object} - Validation result
 */
const validateTagTransfer = async (params, authUser) => {
	const { tagName, domain, faceBase64, password } = params;

	// Validate basic parameters
	if (!faceBase64) {
		return { valid: false, error: "Face data is required" };
	}

	if (!password) {
		return { valid: false, error: "Password is required" };
	}

	// Validate domain and name
	const domainValidation = await validateDomainAndName(domain, tagName);
	if (!domainValidation.valid) {
		return domainValidation;
	}

	// Check if domain supports transfer feature
	if (!supportsFeature(domain, "transfer")) {
		return { valid: false, error: `Domain '${domain}' does not support transfers` };
	}

	// Check transfer limits
	const limits = getDomainLimits(domain);
	if (limits.maxTransferPerDay && authUser.dailyTransfers >= limits.maxTransferPerDay) {
		return { valid: false, error: `Maximum ${limits.maxTransferPerDay} transfers per day exceeded` };
	}

	return {
		valid: true,
		domain: domainValidation.domain,
		name: domainValidation.name,
		tagName: domainValidation.tagName,
	};
};

/**
 * Validate tag renewal request
 * @param {Object} params - Renewal parameters
 * @param {string} params.tagName - Tag name
 * @param {string} params.domain - Domain name
 * @param {string} params.network - Payment network
 * @param {string} params.token - Payment token
 * @param {Object} authUser - Authenticated user
 * @returns {Object} - Validation result
 */
const validateTagRenewal = async (params, authUser) => {
	const { tagName, domain, network, token } = params;

	// Validate basic parameters
	if (!network) {
		return { valid: false, error: "Payment network is required" };
	}

	if (!token) {
		return { valid: false, error: "Payment token is required" };
	}

	// Validate domain and name
	const domainValidation = await validateDomainAndName(domain, tagName);
	if (!domainValidation.valid) {
		return domainValidation;
	}

	// Check if domain supports renewal feature
	if (!supportsFeature(domain, "renewal")) {
		return { valid: false, error: `Domain '${domain}' does not support renewals` };
	}

	// Check renewal limits
	const limits = getDomainLimits(domain);
	if (limits.maxRenewalPerDay && authUser.dailyRenewals >= limits.maxRenewalPerDay) {
		return { valid: false, error: `Maximum ${limits.maxRenewalPerDay} renewals per day exceeded` };
	}

	return {
		valid: true,
		domain: domainValidation.domain,
		name: domainValidation.name,
		tagName: domainValidation.tagName,
	};
};

/**
 * Validate tag search request
 * @param {Object} params - Search parameters
 * @param {string} params.tagName - Tag name (optional)
 * @param {string} params.domain - Domain name (optional)
 * @param {string} params.key - Search key (optional)
 * @param {string} params.value - Search value (optional)
 * @param {Object} authUser - Authenticated user
 * @returns {Object} - Validation result
 */
const validateTagSearch = async (params, authUser) => {
	const { tagName, domain, key, value } = params;

	// If tagName is provided, validate it
	if (tagName) {
		const tagValidation = validateTagNameFormat(tagName);
		if (!tagValidation.valid) {
			return tagValidation;
		}
		return {
			valid: true,
			domain: tagValidation.domain,
			name: tagValidation.name,
			tagName: tagValidation.tagName,
		};
	}

	// If domain is provided, validate it
	if (domain) {
		if (!isDomainSupported(domain)) {
			return { valid: false, error: `Domain '${domain}' is not supported` };
		}

		if (!isDomainActive(domain)) {
			return { valid: false, error: `Domain '${domain}' is not active` };
		}

		return { valid: true, domain };
	}

	// If key and value are provided, validate them
	if (key && value) {
		return { valid: true, key, value };
	}

	// No valid search parameters provided
	return { valid: false, error: "At least one search parameter is required" };
};

/**
 * Validate hold domain request
 * @param {Object} params - Hold domain parameters
 * @param {string} params.tagName - Tag name
 * @param {string} params.domain - Domain name
 * @param {string} params.zelfProof - Zelf proof
 * @param {string} params.zelfProofQRCode - Zelf proof QR code
 * @param {Object} authUser - Authenticated user
 * @returns {Object} - Validation result
 */
const validateHoldDomain = async (params, authUser) => {
	const { tagName, domain, zelfProof, zelfProofQRCode } = params;

	// Validate basic parameters
	if (!zelfProof) {
		return { valid: false, error: "Zelf proof is required" };
	}

	if (!zelfProofQRCode) {
		return { valid: false, error: "Zelf proof QR code is required" };
	}

	// Validate domain and name
	const domainValidation = await validateDomainAndName(domain, tagName);
	if (!domainValidation.valid) {
		return domainValidation;
	}

	// Get domain configuration
	const domainConfig = getDomainConfiguration(domain);
	if (!domainConfig) {
		return { valid: false, error: `Domain '${domain}' configuration not found` };
	}

	// Check if domain supports hold functionality
	if (!domainConfig.holdSuffix) {
		return { valid: false, error: `Domain '${domain}' does not support hold functionality` };
	}

	return {
		valid: true,
		domain: domainValidation.domain,
		name: domainValidation.name,
		tagName: domainValidation.tagName,
		holdDomain: `${domainValidation.name}${domainConfig.holdSuffix}.${domain}`,
		domainConfig,
	};
};

/**
 * Validate payment request
 * @param {Object} params - Payment parameters
 * @param {string} params.domain - Domain name
 * @param {string} params.amount - Payment amount
 * @param {string} params.currency - Payment currency
 * @param {string} params.method - Payment method
 * @param {Object} authUser - Authenticated user
 * @returns {Object} - Validation result
 */
const validatePayment = async (params, authUser) => {
	const { domain, amount, currency, method } = params;

	// Validate basic parameters
	if (!amount || amount <= 0) {
		return { valid: false, error: "Valid payment amount is required" };
	}

	if (!currency) {
		return { valid: false, error: "Payment currency is required" };
	}

	if (!method) {
		return { valid: false, error: "Payment method is required" };
	}

	// Validate domain
	if (!isDomainSupported(domain)) {
		return { valid: false, error: `Domain '${domain}' is not supported` };
	}

	if (!isDomainActive(domain)) {
		return { valid: false, error: `Domain '${domain}' is not active` };
	}

	// Get domain configuration
	const domainConfig = getDomainConfiguration(domain);
	if (!domainConfig) {
		return { valid: false, error: `Domain '${domain}' configuration not found` };
	}

	// Check if payment method is supported
	const supportedMethods = domainConfig.payment?.methods || [];
	if (!supportedMethods.includes(method)) {
		return { valid: false, error: `Payment method '${method}' is not supported for domain '${domain}'` };
	}

	// Check if currency is supported
	const supportedCurrencies = domainConfig.payment?.currencies || [];
	if (!supportedCurrencies.includes(currency)) {
		return { valid: false, error: `Currency '${currency}' is not supported for domain '${domain}'` };
	}

	// Validate amount against domain pricing
	const domainPrice = domainConfig.price || 0;
	if (amount < domainPrice) {
		return { valid: false, error: `Payment amount must be at least ${domainPrice} cents` };
	}

	return {
		valid: true,
		domain,
		amount,
		currency,
		method,
		domainConfig,
	};
};

/**
 * Validate user limits
 * @param {string} domain - Domain name
 * @param {string} operation - Operation type (create, transfer, renew)
 * @param {Object} authUser - Authenticated user
 * @returns {Object} - Validation result
 */
const validateUserLimits = async (domain, operation, authUser) => {
	// Get domain limits
	const limits = getDomainLimits(domain);
	if (!limits) {
		return { valid: true }; // No limits defined
	}

	// Check operation-specific limits
	switch (operation) {
		case "create":
			if (limits.maxTagsPerUser && authUser.tagCount >= limits.maxTagsPerUser) {
				return {
					valid: false,
					error: `Maximum ${limits.maxTagsPerUser} tags per user exceeded`,
				};
			}
			break;

		case "transfer":
			if (limits.maxTransferPerDay && authUser.dailyTransfers >= limits.maxTransferPerDay) {
				return {
					valid: false,
					error: `Maximum ${limits.maxTransferPerDay} transfers per day exceeded`,
				};
			}
			break;

		case "renew":
			if (limits.maxRenewalPerDay && authUser.dailyRenewals >= limits.maxRenewalPerDay) {
				return {
					valid: false,
					error: `Maximum ${limits.maxRenewalPerDay} renewals per day exceeded`,
				};
			}
			break;

		default:
			return { valid: false, error: `Unknown operation: ${operation}` };
	}

	return { valid: true };
};

/**
 * Validate domain feature access
 * @param {string} domain - Domain name
 * @param {string} feature - Feature name
 * @param {Object} authUser - Authenticated user
 * @returns {Object} - Validation result
 */
const validateFeatureAccess = async (domain, feature, authUser) => {
	// Check if domain supports the feature
	if (!supportsFeature(domain, feature)) {
		return { valid: false, error: `Feature '${feature}' is not supported for domain '${domain}'` };
	}

	// Get domain configuration
	const domainConfig = getDomainConfiguration(domain);
	if (!domainConfig) {
		return { valid: false, error: `Domain '${domain}' configuration not found` };
	}

	// Check enterprise access for enterprise domains
	if (domainConfig.type === "enterprise" && !authUser.enterpriseAccess) {
		return { valid: false, error: "Enterprise access required for this domain" };
	}

	// Check pro access for pro features
	if (feature === "admin" && !authUser.pro) {
		return { valid: false, error: "Pro access required for admin features" };
	}

	return { valid: true };
};

/**
 * Get validation summary for a domain
 * @param {string} domain - Domain name
 * @param {Object} authUser - Authenticated user
 * @returns {Object} - Validation summary
 */
const getValidationSummary = async (domain, authUser) => {
	// Get domain configuration
	const domainConfig = getDomainConfiguration(domain);
	if (!domainConfig) {
		return { valid: false, error: `Domain '${domain}' is not supported` };
	}

	// Check domain status
	if (!isDomainActive(domain)) {
		return { valid: false, error: `Domain '${domain}' is not active` };
	}

	// Get user limits
	const limits = getDomainLimits(domain);
	const userLimits = {
		maxTagsPerUser: limits.maxTagsPerUser || 0,
		maxTransferPerDay: limits.maxTransferPerDay || 0,
		maxRenewalPerDay: limits.maxRenewalPerDay || 0,
		currentTags: authUser.tagCount || 0,
		dailyTransfers: authUser.dailyTransfers || 0,
		dailyRenewals: authUser.dailyRenewals || 0,
	};

	// Check available features
	const availableFeatures = domainConfig.features || [];

	// Check user access
	const userAccess = {
		canCreate: true,
		canTransfer: availableFeatures.includes("transfer"),
		canRenew: availableFeatures.includes("renewal"),
		canRecover: availableFeatures.includes("recovery"),
		canAdmin: availableFeatures.includes("admin") && authUser.pro,
	};

	return {
		valid: true,
		domain,
		domainConfig,
		userLimits,
		availableFeatures,
		userAccess,
	};
};

module.exports = {
	validateTagNameFormat,
	validateDomainAndName,
	validateTagCreation,
	validateTagTransfer,
	validateTagRenewal,
	validateTagSearch,
	validateHoldDomain,
	validatePayment,
	validateUserLimits,
	validateFeatureAccess,
	getValidationSummary,
};
