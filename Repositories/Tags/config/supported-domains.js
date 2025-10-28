const { Domain } = require("../modules/domain.class");
const { initCacheInstance } = require("../../../cache/manager");

// Initialize cache for dynamic domains with 1 hour TTL
const domainsCache = initCacheInstance();

/**
 * Supported Domains Configuration
 * This file defines all supported domain types and their configurations using Domain class instances
 *
 * Domain Configuration Structure:
 * - type: "official" | "custom" | "community" | "enterprise"
 * - price: Price in cents (0 = free)
 * - holdSuffix: Suffix for hold domains (e.g., ".hold")
 * - status: "active" | "inactive" | "maintenance" | "beta"
 * - owner: Domain owner identifier
 * - description: Human-readable description
 * - features: Array of supported features
 * - validation: Name validation rules
 * - storage: Storage configuration
 * - payment: Payment options and methods
 * - metadata: Additional domain-specific data
 */

const SUPPORTED_DOMAINS = {};

/**
 * Get domain configuration by domain name
 * @param {string} domain - Domain name (e.g., 'avax', 'btc')
 * @returns {Object|null} - Domain configuration or null if not found
 */
const getDomainConfig = (domain) => {
	if (!domain) return null;

	const supportedDomains = getSupportedDomains();

	const selectedDomain = supportedDomains[domain.toLowerCase()];

	const domainObject = selectedDomain ? new Domain(selectedDomain) : null;

	return domainObject;
};

/**
 * Check if domain is supported
 * @param {string} domain - Domain name
 * @returns {boolean} - True if domain is supported
 */
const isSupported = (domain) => {
	const supportedDomains = getSupportedDomains();
	return domain && supportedDomains.hasOwnProperty(domain.toLowerCase());
};

/**
 * Get all supported domains
 * @param {Array} licenses - Optional array of license objects
 * @returns {Object} - All supported domains
 */
const getAllSupportedDomains = (licenses = null, paid = false) => {
	const domains = getSupportedDomains(licenses);

	if (paid) {
		const paidDomains = {};

		for (const domain in domains) {
			if (domains[domain].stripe?.amountPaid > 0) {
				paidDomains[domain] = domains[domain];
			}
		}

		return paidDomains;
	}

	return domains;
};

/**
 * Get domains by type
 * @param {string} type - Domain type ('official', 'custom', 'enterprise')
 * @returns {Array} - Array of domain configurations
 */
const getByType = (type) => {
	return Object.entries(getSupportedDomains())
		.filter(([_, config]) => config.type === type)
		.map(([domain, config]) => ({ domain, ...config }));
};

/**
 * Validate domain name against domain rules
 * @param {string} domain - Domain name
 * @param {string} name - Name to validate
 * @returns {Object} - Validation result
 */
const validateDomainName = (domain, name) => {
	const config = getDomainConfig(domain);

	if (!config) return { valid: false, error: "Domain not supported" };

	// Check length
	if (name.length < config.tags.minLength) {
		return { valid: false, error: `Name must be at least ${config.tags.minLength} characters` };
	}

	if (name.length > config.tags.maxLength) {
		return { valid: false, error: `Name must be no more than ${config.tags.maxLength} characters` };
	}

	// Check reserved names
	if (config.tags.reserved.includes(name.toLowerCase())) {
		return { valid: false, error: "Name is reserved" };
	}

	return { valid: true };
};

/**
 * Check if domain is active
 * @param {string} domain - Domain name
 * @returns {boolean} - True if domain is active
 */
const isDomainActive = (domain) => {
	const config = getDomainConfig(domain);

	return config && config.status === "active";
};

/**
 * Get active domains only
 * @returns {Array} - Array of active domain configurations
 */
const getActiveDomains = () => {
	return Object.entries(getSupportedDomains())
		.filter(([_, config]) => config.status === "active")
		.map(([domain, config]) => ({ domain, ...config }));
};

/**
 * Get domains by owner
 * @param {string} owner - Domain owner
 * @returns {Array} - Array of domain configurations
 */
const getByOwner = (owner) => {
	return Object.entries(getSupportedDomains())
		.filter(([_, config]) => config.owner === owner)
		.map(([domain, config]) => ({ domain, ...config }));
};

/**
 * Check if domain supports feature
 * @param {string} domain - Domain name
 * @param {string} feature - Feature name
 * @returns {boolean} - True if feature is supported
 */
const supportsFeature = (domain, feature) => {
	const config = getDomainConfig(domain);
	return config && config.features && config.features.includes(feature);
};

/**
 * Get domain storage configuration
 * @param {string} domain - Domain name
 * @returns {Object} - Storage configuration
 */
const getDomainStorageConfig = (domain) => {
	const config = getDomainConfig(domain);
	return (
		config?.storage || {
			keyPrefix: "tagName",
			ipfsEnabled: true,
			arweaveEnabled: true,
			walrusEnabled: true,
			backupEnabled: false,
		}
	);
};

/**
 * Generate hold domain name
 * @param {string} domain - Domain name
 * @param {string} name - Tag name
 * @returns {string} - Hold domain name
 */
const generateHoldDomain = (domain, name) => {
	const config = getDomainConfig(domain);
	const holdSuffix = config?.holdSuffix || ".hold";
	return `${name}${holdSuffix}.${domain}`;
};

/**
 * Get domain payment methods
 * @param {string} domain - Domain name
 * @returns {Array} - Array of payment methods
 */
const getDomainPaymentMethods = (domain) => {
	const config = getDomainConfig(domain);
	return config?.payment?.methods || ["coinbase", "crypto"];
};

/**
 * Get domain currencies
 * @param {string} domain - Domain name
 * @returns {Array} - Array of supported currencies
 */
const getDomainCurrencies = (domain) => {
	const config = getDomainConfig(domain);
	return config?.payment?.currencies || ["USD"];
};

/**
 * Get domain limits
 * @param {string} domain - Domain name
 * @returns {Object} - Domain limits
 */
const getDomainLimits = (domain) => {
	const config = getDomainConfig(domain);
	return (
		config?.limits || {
			maxTagsPerUser: 5,
			maxTransferPerDay: 3,
			maxRenewalPerDay: 2,
		}
	);
};

/**
 * Load dynamic domains from provided licenses data
 * @param {Array} licenses - Array of license objects
 * @returns {Object|null} - Dynamic domains object or null if not available
 */
const loadDynamicDomains = (licenses = null) => {
	try {
		// Check if we have cached domains
		let cachedDomains = domainsCache.get("official-licenses");

		if (cachedDomains) {
			return cachedDomains;
		}

		// If licenses are provided, use them to create domains
		if (licenses && Array.isArray(licenses)) {
			// Convert license data to Domain objects
			const dynamicDomains = {};

			for (const license of licenses) {
				if (license.name) {
					dynamicDomains[license.name.toLowerCase()] = new Domain(license);
				}
			}

			// Cache the result with automatic expiration
			domainsCache.set("official-licenses", dynamicDomains);

			console.log(`Dynamic domains cached: ${Object.keys(dynamicDomains).length} domains`);

			return dynamicDomains;
		}
	} catch (error) {
		console.warn("Failed to load dynamic domains:", error.message);
	}

	return null;
};

const getSupportedDomains = (licenses = null) => {
	try {
		const dynamicDomains = loadDynamicDomains(licenses);

		if (dynamicDomains) {
			// Merge dynamic domains with static ones
			return { ...SUPPORTED_DOMAINS, ...dynamicDomains };
		}
	} catch (error) {
		console.warn("Error loading dynamic domains:", error.message);
	}

	// Fallback to static domains only
	console.log("Using static domains as fallback");
	return SUPPORTED_DOMAINS;
};

module.exports = {
	getSupportedDomains,
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
};
