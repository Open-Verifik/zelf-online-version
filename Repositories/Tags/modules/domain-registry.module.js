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
	// Core domain functions (re-exported from supported-domains)
	getDomainConfiguration,
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

	// Additional domain functions
	validateDomainAndName,
	getDomainMetadata,
	getDomainLaunchDate,
	getDomainVersion,
	getDomainDocumentation,
	getDomainCommunity,
	getDomainEnterprise,
	getDomainSupport,
	isDomainInMaintenance,
	isDomainInBeta,
	getDomainStats,
	getAllDomainStats,
};
