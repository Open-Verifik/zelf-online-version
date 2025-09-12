const {
	SUPPORTED_DOMAINS,
	getDomainConfig,
	isDomainSupported,
	isDomainActive,
	getAllSupportedDomains,
	getDomainsByType,
	getActiveDomains,
	getDomainsByOwner,
	getDomainPrice,
	supportsFeature,
	getDomainStorageConfig,
	generateStorageKey,
	generateHoldDomain,
	getDomainPaymentMethods,
	getDomainCurrencies,
	getDomainLimits,
	validateDomainName,
} = require("../config/supported-domains");

/**
 * Domain Registry Module
 *
 * This module provides a centralized interface for managing domain configurations
 * and domain-specific operations in the Tags system.
 *
 * Key Features:
 * - Domain configuration management
 * - Domain validation and status checking
 * - Domain-specific pricing and payment methods
 * - Domain storage configuration
 * - Domain limits and restrictions
 * - Domain feature support checking
 */

/**
 * Get domain configuration by domain name
 * @param {string} domain - Domain name (e.g., 'avax', 'btc')
 * @returns {Object|null} - Domain configuration or null if not found
 */
const getDomainConfiguration = (domain) => {
	return getDomainConfig(domain);
};

/**
 * Check if domain is supported
 * @param {string} domain - Domain name
 * @returns {boolean} - True if domain is supported
 */
const isDomainSupported = (domain) => {
	return isDomainSupported(domain);
};

/**
 * Check if domain is active
 * @param {string} domain - Domain name
 * @returns {boolean} - True if domain is active
 */
const isDomainActive = (domain) => {
	return isDomainActive(domain);
};

/**
 * Get all supported domains
 * @returns {Object} - All supported domains
 */
const getAllSupportedDomains = () => {
	return getAllSupportedDomains();
};

/**
 * Get domains by type
 * @param {string} type - Domain type ('official', 'custom', 'enterprise')
 * @returns {Array} - Array of domain configurations
 */
const getDomainsByType = (type) => {
	return getDomainsByType(type);
};

/**
 * Get active domains only
 * @returns {Array} - Array of active domain configurations
 */
const getActiveDomains = () => {
	return getActiveDomains();
};

/**
 * Get domains by owner
 * @param {string} owner - Domain owner
 * @returns {Array} - Array of domain configurations
 */
const getDomainsByOwner = (owner) => {
	return getDomainsByOwner(owner);
};

/**
 * Get domain price with discounts
 * @param {string} domain - Domain name
 * @param {string} duration - Duration ('yearly', 'lifetime')
 * @returns {number} - Price in cents
 */
const getDomainPrice = (domain, duration = "yearly") => {
	return getDomainPrice(domain, duration);
};

/**
 * Check if domain supports feature
 * @param {string} domain - Domain name
 * @param {string} feature - Feature name
 * @returns {boolean} - True if feature is supported
 */
const supportsFeature = (domain, feature) => {
	return supportsFeature(domain, feature);
};

/**
 * Get domain storage configuration
 * @param {string} domain - Domain name
 * @returns {Object} - Storage configuration
 */
const getDomainStorageConfig = (domain) => {
	return getDomainStorageConfig(domain);
};

/**
 * Generate storage key for domain
 * @param {string} domain - Domain name
 * @param {string} name - Tag name
 * @returns {string} - Storage key
 */
const generateStorageKey = (domain, name) => {
	return generateStorageKey(domain, name);
};

/**
 * Generate hold domain name
 * @param {string} domain - Domain name
 * @param {string} name - Tag name
 * @returns {string} - Hold domain name
 */
const generateHoldDomain = (domain, name) => {
	return generateHoldDomain(domain, name);
};

/**
 * Get domain payment methods
 * @param {string} domain - Domain name
 * @returns {Array} - Array of payment methods
 */
const getDomainPaymentMethods = (domain) => {
	return getDomainPaymentMethods(domain);
};

/**
 * Get domain currencies
 * @param {string} domain - Domain name
 * @returns {Array} - Array of supported currencies
 */
const getDomainCurrencies = (domain) => {
	return getDomainCurrencies(domain);
};

/**
 * Get domain limits
 * @param {string} domain - Domain name
 * @returns {Object} - Domain limits
 */
const getDomainLimits = (domain) => {
	return getDomainLimits(domain);
};

/**
 * Validate domain name against domain rules
 * @param {string} domain - Domain name
 * @param {string} name - Name to validate
 * @returns {Object} - Validation result
 */
const validateDomainName = async (domain, name) => {
	return await validateDomainName(domain, name);
};

/**
 * Get domain metadata
 * @param {string} domain - Domain name
 * @returns {Object} - Domain metadata
 */
const getDomainMetadata = (domain) => {
	const config = getDomainConfig(domain);
	return config?.metadata || {};
};

/**
 * Check if domain is in maintenance
 * @param {string} domain - Domain name
 * @returns {boolean} - True if domain is in maintenance
 */
const isDomainInMaintenance = (domain) => {
	const config = getDomainConfig(domain);
	return config?.status === "maintenance";
};

/**
 * Check if domain is in beta
 * @param {string} domain - Domain name
 * @returns {boolean} - True if domain is in beta
 */
const isDomainInBeta = (domain) => {
	const config = getDomainConfig(domain);
	return config?.status === "beta";
};

/**
 * Get domain launch date
 * @param {string} domain - Domain name
 * @returns {string|null} - Launch date or null
 */
const getDomainLaunchDate = (domain) => {
	const metadata = getDomainMetadata(domain);
	return metadata.launchDate || null;
};

/**
 * Get domain version
 * @param {string} domain - Domain name
 * @returns {string|null} - Version or null
 */
const getDomainVersion = (domain) => {
	const metadata = getDomainMetadata(domain);
	return metadata.version || null;
};

/**
 * Get domain documentation URL
 * @param {string} domain - Domain name
 * @returns {string|null} - Documentation URL or null
 */
const getDomainDocumentation = (domain) => {
	const metadata = getDomainMetadata(domain);
	return metadata.documentation || null;
};

/**
 * Get domain community
 * @param {string} domain - Domain name
 * @returns {string|null} - Community or null
 */
const getDomainCommunity = (domain) => {
	const metadata = getDomainMetadata(domain);
	return metadata.community || null;
};

/**
 * Get domain enterprise info
 * @param {string} domain - Domain name
 * @returns {string|null} - Enterprise info or null
 */
const getDomainEnterprise = (domain) => {
	const metadata = getDomainMetadata(domain);
	return metadata.enterprise || null;
};

/**
 * Get domain support level
 * @param {string} domain - Domain name
 * @returns {string|null} - Support level or null
 */
const getDomainSupport = (domain) => {
	const metadata = getDomainMetadata(domain);
	return metadata.support || null;
};

/**
 * Validate domain and name combination
 * @param {string} domain - Domain name
 * @param {string} name - Tag name
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

	// Check if domain is in maintenance
	if (isDomainInMaintenance(domain)) {
		return { valid: false, error: `Domain '${domain}' is currently in maintenance` };
	}

	// Validate the name against domain rules
	return await validateDomainName(domain, name);
};

/**
 * Get domain statistics
 * @param {string} domain - Domain name
 * @returns {Object} - Domain statistics
 */
const getDomainStats = (domain) => {
	const config = getDomainConfig(domain);
	if (!config) return null;

	return {
		domain,
		type: config.type,
		status: config.status,
		price: config.price,
		features: config.features.length,
		paymentMethods: config.payment?.methods?.length || 0,
		currencies: config.payment?.currencies?.length || 0,
		limits: config.limits,
		metadata: config.metadata,
	};
};

/**
 * Get all domain statistics
 * @returns {Array} - Array of domain statistics
 */
const getAllDomainStats = () => {
	return Object.keys(SUPPORTED_DOMAINS).map((domain) => getDomainStats(domain));
};

module.exports = {
	// Core domain functions
	getDomainConfiguration,
	isDomainSupported,
	isDomainActive,
	getAllSupportedDomains,
	getDomainsByType,
	getActiveDomains,
	getDomainsByOwner,

	// Domain validation
	validateDomainName,
	validateDomainAndName,

	// Domain pricing and payment
	getDomainPrice,
	getDomainPaymentMethods,
	getDomainCurrencies,

	// Domain features and limits
	supportsFeature,
	getDomainLimits,

	// Domain storage
	getDomainStorageConfig,
	generateStorageKey,
	generateHoldDomain,

	// Domain metadata
	getDomainMetadata,
	getDomainLaunchDate,
	getDomainVersion,
	getDomainDocumentation,
	getDomainCommunity,
	getDomainEnterprise,
	getDomainSupport,

	// Domain status
	isDomainInMaintenance,
	isDomainInBeta,

	// Domain statistics
	getDomainStats,
	getAllDomainStats,
};
