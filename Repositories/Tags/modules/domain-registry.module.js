const {
	SUPPORTED_DOMAINS,
	getDomainConfig,
	isSupported,
	isDomainActive,
	getAllSupportedDomains,
	getByType,
	getActiveDomains,
	getByOwner,
	supportsFeature,
	getDomainStorageConfig,
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
 * Get domain metadata
 * @param {string} domain - Domain name
 * @returns {Object} - Domain metadata
 */
const getDomainMetadata = (domain) => {
	const config = getDomainConfig(domain);
	return config?.metadata || {};
};

/**
 * Get domain features
 * @param {string} domain - Domain name
 * @returns {Array} - Array of supported features
 */
const getFeatures = (domain) => {
	const config = getDomainConfig(domain);
	return config?.features || [];
};

/**
 * Get domain description
 * @param {string} domain - Domain name
 * @returns {string} - Domain description
 */
const getDescription = (domain) => {
	const config = getDomainConfig(domain);
	return config?.description || "";
};

/**
 * Get domain owner
 * @param {string} domain - Domain name
 * @returns {string} - Domain owner
 */
const getOwner = (domain) => {
	const config = getDomainConfig(domain);
	return config?.owner || "";
};

/**
 * Get domain type
 * @param {string} domain - Domain name
 * @returns {string} - Domain type
 */
const getType = (domain) => {
	const config = getDomainConfig(domain);
	return config?.type || "";
};

/**
 * Get domain status
 * @param {string} domain - Domain name
 * @returns {string} - Domain status
 */
const getStatus = (domain) => {
	const config = getDomainConfig(domain);
	return config?.status || "";
};

/**
 * Get hold suffix for domain
 * @param {string} domain - Domain name
 * @returns {string} - Hold suffix
 */
const getHoldSuffix = (domain) => {
	const config = getDomainConfig(domain);
	return config?.holdSuffix || ".hold";
};

/**
 * Get pricing table for domain
 * @param {string} domain - Domain name
 * @returns {Object} - Pricing table
 */
const getPricingTable = (domain) => {
	const config = getDomainConfig(domain);

	return config?.tags?.payment?.pricingTable || {};
};

/**
 * Get discounts for domain
 * @param {string} domain - Domain name
 * @returns {Object} - Discount configuration
 */
const getDiscounts = (domain) => {
	const config = getDomainConfig(domain);
	return config?.payment?.discounts || {};
};

/**
 * Check if domain has IPFS enabled
 * @param {string} domain - Domain name
 * @returns {boolean} - True if IPFS is enabled
 */
const isIPFSEnabled = (domain) => {
	const config = getDomainConfig(domain);
	return config?.storage?.ipfsEnabled || false;
};

/**
 * Check if domain has Arweave enabled
 * @param {string} domain - Domain name
 * @returns {boolean} - True if Arweave is enabled
 */
const isArweaveEnabled = (domain) => {
	const config = getDomainConfig(domain);
	return config?.storage?.arweaveEnabled || false;
};

/**
 * Check if domain has backup enabled
 * @param {string} domain - Domain name
 * @returns {boolean} - True if backup is enabled
 */
const isBackupEnabled = (domain) => {
	const config = getDomainConfig(domain);
	return config?.storage?.backupEnabled || false;
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
		name: domain,
		type: config.type,
		status: config.status,
		owner: config.owner,
		price: config.price,
		features: config.features || [],
		limits: config.limits || {},
		metadata: config.metadata || {},
	};
};

/**
 * List all domain names
 * @returns {Array} - Array of domain names
 */
const listDomainNames = () => {
	return Object.keys(SUPPORTED_DOMAINS);
};

/**
 * Get domain count
 * @returns {number} - Total number of domains
 */
const getDomainCount = () => {
	return Object.keys(SUPPORTED_DOMAINS).length;
};

/**
 * Get active domain count
 * @returns {number} - Number of active domains
 */
const getActiveDomainCount = () => {
	return getActiveDomains().length;
};

/**
 * Get validation rules for domain
 * @param {string} domain - Domain name
 * @returns {Object} - Validation rules
 */
const getValidationRules = (domain) => {
	const config = getDomainConfig(domain);
	return config?.validation || {};
};

module.exports = {
	// Core domain methods
	getDomainConfiguration: getDomainConfig,
	isDomainSupported: isSupported,
	isDomainActive,
	getAllSupportedDomains,
	getDomainsByType: getByType,
	getActiveDomains,
	getDomainsByOwner: getByOwner,
	getDomainType: getType,
	getDomainStatus: getStatus,
	getDomainOwner: getOwner,
	getDomainDescription: getDescription,
	getDomainMetadata,

	// Features and capabilities
	supportsFeature,
	getFeatures,

	// Storage configuration
	getDomainStorageConfig,
	isIPFSEnabled,
	isArweaveEnabled,
	isBackupEnabled,

	generateHoldDomain,
	getHoldSuffix,

	// Payment configuration
	getDomainPaymentMethods,
	getDomainCurrencies,
	getPricingTable,
	getDiscounts,

	// Limits and restrictions
	getDomainLimits,

	// Validation
	validateDomainName,
	getValidationRules,

	// Statistics and info
	getDomainStats,
	getDomainCount,
	getActiveDomainCount,
	listDomainNames,
};
