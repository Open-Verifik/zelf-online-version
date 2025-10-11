const { Domain } = require("../modules/domain.class");
const fs = require("fs");
const path = require("path");

// Cache file path for license data
const CACHE_FILE_PATH = path.join(__dirname, "../../../cache/official-licenses-cache.json");

// In-memory cache for dynamic domains
let cachedDynamicDomains = null;

let lastCacheTimestamp = null;

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

const SUPPORTED_DOMAINS = {
	// Official Zelf domain (existing functionality)
	// zelf: new Domain({
	// 	name: "zelf",
	// 	type: "official",
	// 	holdSuffix: ".hold",
	// 	status: "active",
	// 	owner: "zelf-team",
	// 	description: "Official Zelf domain",
	// 	limits: {
	// 		tags: 10000,
	// 		zelfkeys: 10000,
	// 	},
	// 	features: [
	// 		{
	// 			name: "Zelf Name Service",
	// 			code: "zns",
	// 			description: "Encryptions, Decryptions, previews of ZelfProofs",
	// 			enabled: true,
	// 		},
	// 		{
	// 			name: "Zelf Keys",
	// 			code: "zelfkeys",
	// 			description: "Zelf Keys: Passwords, Notes, Credit Cards, etc.",
	// 			enabled: true,
	// 		},
	// 	],
	// 	validation: {
	// 		minLength: 1,
	// 		maxLength: 27,
	// 		allowedChars: /^[a-zA-Z0-9][a-zA-Z0-9-]*[a-zA-Z0-9]$/,
	// 		reserved: ["www", "api", "admin", "support", "help", "zelf"],
	// 		customRules: [],
	// 	},
	// 	storage: {
	// 		keyPrefix: "zelfName",
	// 		ipfsEnabled: true,
	// 		arweaveEnabled: true,
	// 		walrusEnabled: true,
	// 	},
	// 	tagPaymentSettings: {
	// 		methods: ["coinbase", "crypto", "stripe"],
	// 		currencies: ["USD", "BTC", "ETH", "SOL"],
	// 		whitelist: {
	// 			"migueltrevino.zelf": "24$",
	// 			"migueltrevinom.zelf": "50%",
	// 		},
	// 		pricingTable: {
	// 			1: { 1: 240, 2: 432, 3: 612, 4: 768, 5: 900, lifetime: 3600 },
	// 			2: { 1: 120, 2: 216, 3: 306, 4: 384, 5: 450, lifetime: 1800 },
	// 			3: { 1: 72, 2: 130, 3: 184, 4: 230, 5: 270, lifetime: 1080 },
	// 			4: { 1: 36, 2: 65, 3: 92, 4: 115, 5: 135, lifetime: 540 },
	// 			5: { 1: 30, 2: 54, 3: 76, 4: 96, 5: 112, lifetime: 450 },
	// 			"6-15": { 1: 24, 2: 43, 3: 61, 4: 77, 5: 90, lifetime: 360 },
	// 			16: { 1: 23, 2: 41, 3: 59, 4: 74, 5: 86, lifetime: 345 },
	// 			17: { 1: 22, 2: 40, 3: 56, 4: 70, 5: 82, lifetime: 330 },
	// 			18: { 1: 21, 2: 38, 3: 54, 4: 67, 5: 79, lifetime: 315 },
	// 			19: { 1: 20, 2: 36, 3: 51, 4: 64, 5: 75, lifetime: 300 },
	// 			20: { 1: 19, 2: 34, 3: 48, 4: 61, 5: 72, lifetime: 285 },
	// 			21: { 1: 18, 2: 32, 3: 46, 4: 58, 5: 68, lifetime: 270 },
	// 			22: { 1: 17, 2: 31, 3: 43, 4: 54, 5: 64, lifetime: 255 },
	// 			23: { 1: 16, 2: 29, 3: 41, 4: 51, 5: 60, lifetime: 240 },
	// 			24: { 1: 15, 2: 27, 3: 38, 4: 48, 5: 56, lifetime: 225 },
	// 			25: { 1: 14, 2: 25, 3: 36, 4: 45, 5: 53, lifetime: 210 },
	// 			26: { 1: 13, 2: 23, 3: 33, 4: 42, 5: 49, lifetime: 195 },
	// 			27: { 1: 12, 2: 22, 3: 31, 4: 38, 5: 45, lifetime: 180 },
	// 		},
	// 	},
	// 	metadata: {
	// 		launchDate: "2023-01-01",
	// 		version: "1.0.0",
	// 		documentation: "https://docs.zelf.world",
	// 	},
	// }),
	// // Avalanche community domain
	// avax: new Domain({
	// 	name: "avax",
	// 	type: "custom",
	// 	holdSuffix: ".hold",
	// 	status: "active",
	// 	owner: "avalanche-community",
	// 	description: "Avalanche community domain",
	// 	limits: {
	// 		tags: 10000,
	// 		zelfkeys: 10000,
	// 	},
	// 	features: [
	// 		{
	// 			name: "Zelf Name Service",
	// 			code: "zns",
	// 			description: "Encryptions, Decryptions, previews of ZelfProofs",
	// 			enabled: true,
	// 		},
	// 		{
	// 			name: "Zelf Keys",
	// 			code: "zelfkeys",
	// 			description: "Zelf Keys: Passwords, Notes, Credit Cards, etc.",
	// 			enabled: true,
	// 		},
	// 	],
	// 	validation: {
	// 		minLength: 1,
	// 		maxLength: 20,
	// 		allowedChars: /^[a-zA-Z0-9][a-zA-Z0-9-]*[a-zA-Z0-9]$/,
	// 		reserved: ["www", "api", "admin", "avalanche", "avax", "carlos"],
	// 		customRules: [],
	// 	},
	// 	storage: {
	// 		keyPrefix: "avaxName",
	// 		ipfsEnabled: true,
	// 		arweaveEnabled: true,
	// 		walrusEnabled: true,
	// 		backupEnabled: false,
	// 	},
	// 	tagPaymentSettings: {
	// 		methods: ["coinbase", "crypto", "stripe"],
	// 		currencies: ["USD", "AVAX", "BTC", "ETH"],
	// 		whitelist: {
	// 			"privacy.avax": "24$",
	// 			"security.avax": "25%",
	// 		},
	// 		pricingTable: {
	// 			1: { 1: 240, 2: 432, 3: 612, 4: 768, 5: 900, lifetime: 3600 },
	// 			2: { 1: 120, 2: 216, 3: 306, 4: 384, 5: 450, lifetime: 1800 },
	// 			3: { 1: 72, 2: 130, 3: 184, 4: 230, 5: 270, lifetime: 1080 },
	// 			4: { 1: 36, 2: 65, 3: 92, 4: 115, 5: 135, lifetime: 540 },
	// 			5: { 1: 30, 2: 54, 3: 76, 4: 96, 5: 112, lifetime: 450 },
	// 			"6-15": { 1: 24, 2: 43, 3: 61, 4: 77, 5: 90, lifetime: 360 },
	// 			16: { 1: 23, 2: 41, 3: 59, 4: 74, 5: 86, lifetime: 345 },
	// 			17: { 1: 22, 2: 40, 3: 56, 4: 70, 5: 82, lifetime: 330 },
	// 			18: { 1: 21, 2: 38, 3: 54, 4: 67, 5: 79, lifetime: 315 },
	// 			19: { 1: 20, 2: 36, 3: 51, 4: 64, 5: 75, lifetime: 300 },
	// 			20: { 1: 19, 2: 34, 3: 48, 4: 61, 5: 72, lifetime: 285 },
	// 			21: { 1: 18, 2: 32, 3: 46, 4: 58, 5: 68, lifetime: 270 },
	// 			22: { 1: 17, 2: 31, 3: 43, 4: 54, 5: 64, lifetime: 255 },
	// 			23: { 1: 16, 2: 29, 3: 41, 4: 51, 5: 60, lifetime: 240 },
	// 			24: { 1: 15, 2: 27, 3: 38, 4: 48, 5: 56, lifetime: 225 },
	// 			25: { 1: 14, 2: 25, 3: 36, 4: 45, 5: 53, lifetime: 210 },
	// 			26: { 1: 13, 2: 23, 3: 33, 4: 42, 5: 49, lifetime: 195 },
	// 			27: { 1: 12, 2: 22, 3: 31, 4: 38, 5: 45, lifetime: 180 },
	// 		},
	// 	},
	// 	metadata: {
	// 		launchDate: "2024-01-15",
	// 		version: "1.0.0",
	// 		documentation: "https://docs.avax.zelf.world",
	// 		community: "avalanche",
	// 	},
	// }),
	// // Enterprise domain example
	// bdag: new Domain({
	// 	name: "bdag",
	// 	type: "enterprise",
	// 	holdSuffix: ".hold",
	// 	status: "active",
	// 	owner: "blockDAG",
	// 	description: "blockDAG enterprise domain",
	// 	limits: {
	// 		tags: 10000,
	// 		zelfkeys: 10000,
	// 	},
	// 	features: [
	// 		{
	// 			name: "Zelf Name Service",
	// 			code: "zns",
	// 			description: "Encryptions, Decryptions, previews of ZelfProofs",
	// 			enabled: true,
	// 		},
	// 		{
	// 			name: "Zelf Keys",
	// 			code: "zelfkeys",
	// 			description: "Zelf Keys: Passwords, Notes, Credit Cards, etc.",
	// 			enabled: true,
	// 		},
	// 	],
	// 	validation: {
	// 		minLength: 3,
	// 		maxLength: 20,
	// 		allowedChars: /^[a-zA-Z0-9][a-zA-Z0-9-]*[a-zA-Z0-9]$/,
	// 		reserved: ["www", "api", "admin", "blockDAG", "bdag"],
	// 		customRules: [],
	// 	},
	// 	storage: {
	// 		keyPrefix: "tagName",
	// 		ipfsEnabled: true,
	// 		arweaveEnabled: false, // Enterprise might prefer private storage
	// 		walrusEnabled: true,
	// 	},
	// 	tagPaymentSettings: {
	// 		methods: ["coinbase", "crypto", "stripe"],
	// 		currencies: ["USD", "BTC", "ETH", "SOL"],
	// 		pricingTable: {
	// 			1: { 1: 240, 2: 432, 3: 612, 4: 768, 5: 900, lifetime: 3600 },
	// 			2: { 1: 120, 2: 216, 3: 306, 4: 384, 5: 450, lifetime: 1800 },
	// 			3: { 1: 72, 2: 130, 3: 184, 4: 230, 5: 270, lifetime: 1080 },
	// 			4: { 1: 36, 2: 65, 3: 92, 4: 115, 5: 135, lifetime: 540 },
	// 			5: { 1: 30, 2: 54, 3: 76, 4: 96, 5: 112, lifetime: 450 },
	// 			"6-15": { 1: 24, 2: 43, 3: 61, 4: 77, 5: 90, lifetime: 360 },
	// 			16: { 1: 23, 2: 41, 3: 59, 4: 74, 5: 86, lifetime: 345 },
	// 			17: { 1: 22, 2: 40, 3: 56, 4: 70, 5: 82, lifetime: 330 },
	// 			18: { 1: 21, 2: 38, 3: 54, 4: 67, 5: 79, lifetime: 315 },
	// 			19: { 1: 20, 2: 36, 3: 51, 4: 64, 5: 75, lifetime: 300 },
	// 			20: { 1: 19, 2: 34, 3: 48, 4: 61, 5: 72, lifetime: 285 },
	// 			21: { 1: 18, 2: 32, 3: 46, 4: 58, 5: 68, lifetime: 270 },
	// 			22: { 1: 17, 2: 31, 3: 43, 4: 54, 5: 64, lifetime: 255 },
	// 			23: { 1: 16, 2: 29, 3: 41, 4: 51, 5: 60, lifetime: 240 },
	// 			24: { 1: 15, 2: 27, 3: 38, 4: 48, 5: 56, lifetime: 225 },
	// 			25: { 1: 14, 2: 25, 3: 36, 4: 45, 5: 53, lifetime: 210 },
	// 			26: { 1: 13, 2: 23, 3: 33, 4: 42, 5: 49, lifetime: 195 },
	// 			27: { 1: 12, 2: 22, 3: 31, 4: 38, 5: 45, lifetime: 180 },
	// 		},
	// 	},
	// 	metadata: {
	// 		launchDate: "2024-04-01",
	// 		version: "1.0.0",
	// 		documentation: "https://docs.bdag.zelf.world",
	// 		enterprise: "blockDAG",
	// 		support: "enterprise",
	// 	},
	// }),
};

/**
 * Get domain configuration by domain name
 * @param {string} domain - Domain name (e.g., 'avax', 'btc')
 * @returns {Object|null} - Domain configuration or null if not found
 */
const getDomainConfig = (domain) => {
	const supportedDomains = getSupportedDomains();

	return supportedDomains[domain.toLowerCase()] || null;
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
 * @returns {Object} - All supported domains
 */
const getAllSupportedDomains = () => {
	return getSupportedDomains();
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
 * Load dynamic domains from cache file (with in-memory caching)
 * @returns {Object|null} - Dynamic domains object or null if not available
 */
const loadDynamicDomains = () => {
	try {
		if (!fs.existsSync(CACHE_FILE_PATH)) {
			return null;
		}

		const stats = fs.statSync(CACHE_FILE_PATH);
		const currentTimestamp = stats.mtime.getTime();

		// Return cached version if file hasn't changed
		if (cachedDynamicDomains && lastCacheTimestamp === currentTimestamp) {
			return cachedDynamicDomains;
		}

		const cacheContent = fs.readFileSync(CACHE_FILE_PATH, "utf8");
		const cacheData = JSON.parse(cacheContent);

		if (cacheData.licenses && Array.isArray(cacheData.licenses)) {
			// Convert license data to Domain objects
			const dynamicDomains = {};
			for (const license of cacheData.licenses) {
				if (license.name) {
					dynamicDomains[license.name.toLowerCase()] = new Domain(license);
				}
			}

			// Cache the result
			cachedDynamicDomains = dynamicDomains;
			lastCacheTimestamp = currentTimestamp;

			return dynamicDomains;
		}
	} catch (error) {
		console.warn("Failed to load dynamic domains from cache:", error.message);
	}

	return null;
};

const getSupportedDomains = () => {
	const dynamicDomains = loadDynamicDomains();

	if (dynamicDomains) {
		// Merge dynamic domains with static ones
		return { ...SUPPORTED_DOMAINS, ...dynamicDomains };
	}

	// Fallback to static domains only
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
