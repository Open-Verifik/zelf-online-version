const { Domain } = require("../modules/domain.class");

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
 * - limits: Usage limits and restrictions
 * - metadata: Additional domain-specific data
 */

const SUPPORTED_DOMAINS = {
	// Official Zelf domain (existing functionality)
	zelf: new Domain({
		name: "zelf",
		type: "official",
		holdSuffix: ".hold",
		status: "active",
		owner: "zelf-team",
		description: "Official Zelf domain",
		features: ["biometric", "wallet", "payment", "recovery", "transfer", "renewal"],
		validation: {
			minLength: 3,
			maxLength: 50,
			allowedChars: /^[a-zA-Z0-9][a-zA-Z0-9-]*[a-zA-Z0-9]$/,
			reserved: ["www", "api", "admin", "support", "help", "zelf"],
			customRules: [],
		},
		storage: {
			keyPrefix: "zelfName",
			ipfsEnabled: true,
			arweaveEnabled: true,
			backupEnabled: true,
		},
		payment: {
			methods: ["coinbase", "crypto", "wallet"],
			currencies: ["USD", "BTC", "ETH", "SOL"],
			discounts: {
				yearly: 0.2, // 20% discount for yearly
				lifetime: 0.5, // 50% discount for lifetime
			},
			whitelist: {
				"zelfmedellin2025.zelf": 24,
				"zelfbogota2025.zelf": 25,
			},
			pricingTable: {
				1: { 1: 240, 2: 432, 3: 612, 4: 768, 5: 900, lifetime: 3600 },
				2: { 1: 120, 2: 216, 3: 306, 4: 384, 5: 450, lifetime: 1800 },
				3: { 1: 72, 2: 130, 3: 184, 4: 230, 5: 270, lifetime: 1080 },
				4: { 1: 36, 2: 65, 3: 92, 4: 115, 5: 135, lifetime: 540 },
				5: { 1: 30, 2: 54, 3: 76, 4: 96, 5: 112, lifetime: 450 },
				"6-15": { 1: 24, 2: 43, 3: 61, 4: 77, 5: 90, lifetime: 360 },
				16: { 1: 23, 2: 41, 3: 59, 4: 74, 5: 86, lifetime: 345 },
				17: { 1: 22, 2: 40, 3: 56, 4: 70, 5: 82, lifetime: 330 },
				18: { 1: 21, 2: 38, 3: 54, 4: 67, 5: 79, lifetime: 315 },
				19: { 1: 20, 2: 36, 3: 51, 4: 64, 5: 75, lifetime: 300 },
				20: { 1: 19, 2: 34, 3: 48, 4: 61, 5: 72, lifetime: 285 },
				21: { 1: 18, 2: 32, 3: 46, 4: 58, 5: 68, lifetime: 270 },
				22: { 1: 17, 2: 31, 3: 43, 4: 54, 5: 64, lifetime: 255 },
				23: { 1: 16, 2: 29, 3: 41, 4: 51, 5: 60, lifetime: 240 },
				24: { 1: 15, 2: 27, 3: 38, 4: 48, 5: 56, lifetime: 225 },
				25: { 1: 14, 2: 25, 3: 36, 4: 45, 5: 53, lifetime: 210 },
				26: { 1: 13, 2: 23, 3: 33, 4: 42, 5: 49, lifetime: 195 },
				27: { 1: 12, 2: 22, 3: 31, 4: 38, 5: 45, lifetime: 180 },
			},
		},
		limits: {
			maxTagsPerUser: 10,
			maxTransferPerDay: 5,
			maxRenewalPerDay: 3,
		},
		metadata: {
			launchDate: "2023-01-01",
			version: "1.0.0",
			documentation: "https://docs.zelf.world",
		},
	}),
	// Avalanche community domain
	avax: new Domain({
		name: "avax",
		type: "custom",
		price: 100, // $1.00 in cents
		holdSuffix: ".hold",
		status: "active",
		owner: "avalanche-community",
		description: "Avalanche community domain",
		features: ["biometric", "wallet", "payment", "transfer", "renewal"],
		validation: {
			minLength: 3,
			maxLength: 30,
			allowedChars: /^[a-zA-Z0-9][a-zA-Z0-9-]*[a-zA-Z0-9]$/,
			reserved: ["www", "api", "admin", "avalanche", "avax"],
			customRules: [],
		},
		storage: {
			keyPrefix: "avaxName",
			ipfsEnabled: true,
			arweaveEnabled: true,
			backupEnabled: false,
		},
		payment: {
			methods: ["coinbase", "crypto", "wallet"],
			currencies: ["USD", "AVAX", "BTC", "ETH"],
			discounts: {
				yearly: 0.15, // 15% discount for yearly
				lifetime: 0.3, // 30% discount for lifetime
			},
			whitelist: {
				"privacy.avax": "24$",
				"security.avax": "25%",
			},
			pricingTable: {
				1: { 1: 240, 2: 432, 3: 612, 4: 768, 5: 900, lifetime: 3600 },
				2: { 1: 120, 2: 216, 3: 306, 4: 384, 5: 450, lifetime: 1800 },
				3: { 1: 72, 2: 130, 3: 184, 4: 230, 5: 270, lifetime: 1080 },
				4: { 1: 36, 2: 65, 3: 92, 4: 115, 5: 135, lifetime: 540 },
				5: { 1: 30, 2: 54, 3: 76, 4: 96, 5: 112, lifetime: 450 },
				"6-15": { 1: 24, 2: 43, 3: 61, 4: 77, 5: 90, lifetime: 360 },
				16: { 1: 23, 2: 41, 3: 59, 4: 74, 5: 86, lifetime: 345 },
				17: { 1: 22, 2: 40, 3: 56, 4: 70, 5: 82, lifetime: 330 },
				18: { 1: 21, 2: 38, 3: 54, 4: 67, 5: 79, lifetime: 315 },
				19: { 1: 20, 2: 36, 3: 51, 4: 64, 5: 75, lifetime: 300 },
				20: { 1: 19, 2: 34, 3: 48, 4: 61, 5: 72, lifetime: 285 },
				21: { 1: 18, 2: 32, 3: 46, 4: 58, 5: 68, lifetime: 270 },
				22: { 1: 17, 2: 31, 3: 43, 4: 54, 5: 64, lifetime: 255 },
				23: { 1: 16, 2: 29, 3: 41, 4: 51, 5: 60, lifetime: 240 },
				24: { 1: 15, 2: 27, 3: 38, 4: 48, 5: 56, lifetime: 225 },
				25: { 1: 14, 2: 25, 3: 36, 4: 45, 5: 53, lifetime: 210 },
				26: { 1: 13, 2: 23, 3: 33, 4: 42, 5: 49, lifetime: 195 },
				27: { 1: 12, 2: 22, 3: 31, 4: 38, 5: 45, lifetime: 180 },
			},
		},
		limits: {
			maxTagsPerUser: 5,
			maxTransferPerDay: 3,
			maxRenewalPerDay: 2,
		},
		metadata: {
			launchDate: "2024-01-15",
			version: "1.0.0",
			documentation: "https://docs.avax.zelf.world",
			community: "avalanche",
		},
	}),
	// Bitcoin community domain
	btc: new Domain({
		name: "btc",
		type: "custom",
		price: 50, // $0.50 in cents
		holdSuffix: ".hold",
		status: "active",
		owner: "bitcoin-community",
		description: "Bitcoin community domain",
		features: ["biometric", "wallet", "payment", "transfer", "renewal"],
		validation: {
			minLength: 3,
			maxLength: 25,
			allowedChars: /^[a-zA-Z0-9][a-zA-Z0-9-]*[a-zA-Z0-9]$/,
			reserved: ["www", "api", "admin", "bitcoin", "btc"],
			customRules: [],
		},
		storage: {
			keyPrefix: "btcName",
			ipfsEnabled: true,
			arweaveEnabled: false,
			backupEnabled: false,
		},
		payment: {
			methods: ["coinbase", "crypto", "wallet"],
			currencies: ["USD", "BTC", "ETH"],
			discounts: {
				yearly: 0.1, // 10% discount for yearly
				lifetime: 0.25, // 25% discount for lifetime
			},
			pricingTable: {
				1: { 1: 240, 2: 432, 3: 612, 4: 768, 5: 900, lifetime: 3600 },
				2: { 1: 120, 2: 216, 3: 306, 4: 384, 5: 450, lifetime: 1800 },
				3: { 1: 72, 2: 130, 3: 184, 4: 230, 5: 270, lifetime: 1080 },
				4: { 1: 36, 2: 65, 3: 92, 4: 115, 5: 135, lifetime: 540 },
				5: { 1: 30, 2: 54, 3: 76, 4: 96, 5: 112, lifetime: 450 },
				"6-15": { 1: 24, 2: 43, 3: 61, 4: 77, 5: 90, lifetime: 360 },
				16: { 1: 23, 2: 41, 3: 59, 4: 74, 5: 86, lifetime: 345 },
				17: { 1: 22, 2: 40, 3: 56, 4: 70, 5: 82, lifetime: 330 },
				18: { 1: 21, 2: 38, 3: 54, 4: 67, 5: 79, lifetime: 315 },
				19: { 1: 20, 2: 36, 3: 51, 4: 64, 5: 75, lifetime: 300 },
				20: { 1: 19, 2: 34, 3: 48, 4: 61, 5: 72, lifetime: 285 },
				21: { 1: 18, 2: 32, 3: 46, 4: 58, 5: 68, lifetime: 270 },
				22: { 1: 17, 2: 31, 3: 43, 4: 54, 5: 64, lifetime: 255 },
				23: { 1: 16, 2: 29, 3: 41, 4: 51, 5: 60, lifetime: 240 },
				24: { 1: 15, 2: 27, 3: 38, 4: 48, 5: 56, lifetime: 225 },
				25: { 1: 14, 2: 25, 3: 36, 4: 45, 5: 53, lifetime: 210 },
				26: { 1: 13, 2: 23, 3: 33, 4: 42, 5: 49, lifetime: 195 },
				27: { 1: 12, 2: 22, 3: 31, 4: 38, 5: 45, lifetime: 180 },
			},
		},
		limits: {
			maxTagsPerUser: 3,
			maxTransferPerDay: 2,
			maxRenewalPerDay: 1,
		},
		metadata: {
			launchDate: "2024-02-01",
			version: "1.0.0",
			documentation: "https://docs.btc.zelf.world",
			community: "bitcoin",
		},
	}),
	// Tech community domain
	tech: new Domain({
		name: "tech",
		type: "custom",
		price: 75, // $0.75 in cents
		holdSuffix: ".hold",
		status: "active",
		owner: "tech-community",
		description: "Technology community domain",
		features: ["biometric", "wallet", "payment", "transfer", "renewal"],
		validation: {
			minLength: 3,
			maxLength: 40,
			allowedChars: /^[a-zA-Z0-9][a-zA-Z0-9-]*[a-zA-Z0-9]$/,
			reserved: ["www", "api", "admin", "tech", "technology"],
			customRules: [],
		},
		storage: {
			keyPrefix: "techName",
			ipfsEnabled: true,
			arweaveEnabled: true,
			backupEnabled: true,
		},
		payment: {
			methods: ["coinbase", "crypto", "wallet"],
			currencies: ["USD", "BTC", "ETH", "SOL"],
			discounts: {
				yearly: 0.25, // 25% discount for yearly
				lifetime: 0.4, // 40% discount for lifetime
			},
			pricingTable: {
				1: { 1: 240, 2: 432, 3: 612, 4: 768, 5: 900, lifetime: 3600 },
				2: { 1: 120, 2: 216, 3: 306, 4: 384, 5: 450, lifetime: 1800 },
				3: { 1: 72, 2: 130, 3: 184, 4: 230, 5: 270, lifetime: 1080 },
				4: { 1: 36, 2: 65, 3: 92, 4: 115, 5: 135, lifetime: 540 },
				5: { 1: 30, 2: 54, 3: 76, 4: 96, 5: 112, lifetime: 450 },
				"6-15": { 1: 24, 2: 43, 3: 61, 4: 77, 5: 90, lifetime: 360 },
				16: { 1: 23, 2: 41, 3: 59, 4: 74, 5: 86, lifetime: 345 },
				17: { 1: 22, 2: 40, 3: 56, 4: 70, 5: 82, lifetime: 330 },
				18: { 1: 21, 2: 38, 3: 54, 4: 67, 5: 79, lifetime: 315 },
				19: { 1: 20, 2: 36, 3: 51, 4: 64, 5: 75, lifetime: 300 },
				20: { 1: 19, 2: 34, 3: 48, 4: 61, 5: 72, lifetime: 285 },
				21: { 1: 18, 2: 32, 3: 46, 4: 58, 5: 68, lifetime: 270 },
				22: { 1: 17, 2: 31, 3: 43, 4: 54, 5: 64, lifetime: 255 },
				23: { 1: 16, 2: 29, 3: 41, 4: 51, 5: 60, lifetime: 240 },
				24: { 1: 15, 2: 27, 3: 38, 4: 48, 5: 56, lifetime: 225 },
				25: { 1: 14, 2: 25, 3: 36, 4: 45, 5: 53, lifetime: 210 },
				26: { 1: 13, 2: 23, 3: 33, 4: 42, 5: 49, lifetime: 195 },
				27: { 1: 12, 2: 22, 3: 31, 4: 38, 5: 45, lifetime: 180 },
			},
		},
		limits: {
			maxTagsPerUser: 8,
			maxTransferPerDay: 4,
			maxRenewalPerDay: 3,
		},
		metadata: {
			launchDate: "2024-03-01",
			version: "1.0.0",
			documentation: "https://docs.tech.zelf.world",
			community: "tech",
		},
	}),
	// Enterprise domain example
	bdag: new Domain({
		name: "bdag",
		type: "enterprise",
		price: 500, // $5.00 in cents
		holdSuffix: ".hold",
		status: "active",
		owner: "blockDAG",
		description: "blockDAG enterprise domain",
		features: ["biometric", "wallet", "payment", "enterprise", "transfer", "renewal", "admin"],
		validation: {
			minLength: 3,
			maxLength: 20,
			allowedChars: /^[a-zA-Z0-9][a-zA-Z0-9-]*[a-zA-Z0-9]$/,
			reserved: ["www", "api", "admin", "blockDAG", "bdag"],
			customRules: [],
		},
		storage: {
			keyPrefix: "bDAGName",
			ipfsEnabled: true,
			arweaveEnabled: false, // Enterprise might prefer private storage
			backupEnabled: true,
		},
		payment: {
			methods: ["coinbase", "crypto", "wallet", "enterprise"],
			currencies: ["USD", "BTC", "ETH", "SOL"],
			discounts: {
				yearly: 0.3, // 30% discount for yearly
				lifetime: 0.5, // 50% discount for lifetime
			},
			pricingTable: {
				1: { 1: 240, 2: 432, 3: 612, 4: 768, 5: 900, lifetime: 3600 },
				2: { 1: 120, 2: 216, 3: 306, 4: 384, 5: 450, lifetime: 1800 },
				3: { 1: 72, 2: 130, 3: 184, 4: 230, 5: 270, lifetime: 1080 },
				4: { 1: 36, 2: 65, 3: 92, 4: 115, 5: 135, lifetime: 540 },
				5: { 1: 30, 2: 54, 3: 76, 4: 96, 5: 112, lifetime: 450 },
				"6-15": { 1: 24, 2: 43, 3: 61, 4: 77, 5: 90, lifetime: 360 },
				16: { 1: 23, 2: 41, 3: 59, 4: 74, 5: 86, lifetime: 345 },
				17: { 1: 22, 2: 40, 3: 56, 4: 70, 5: 82, lifetime: 330 },
				18: { 1: 21, 2: 38, 3: 54, 4: 67, 5: 79, lifetime: 315 },
				19: { 1: 20, 2: 36, 3: 51, 4: 64, 5: 75, lifetime: 300 },
				20: { 1: 19, 2: 34, 3: 48, 4: 61, 5: 72, lifetime: 285 },
				21: { 1: 18, 2: 32, 3: 46, 4: 58, 5: 68, lifetime: 270 },
				22: { 1: 17, 2: 31, 3: 43, 4: 54, 5: 64, lifetime: 255 },
				23: { 1: 16, 2: 29, 3: 41, 4: 51, 5: 60, lifetime: 240 },
				24: { 1: 15, 2: 27, 3: 38, 4: 48, 5: 56, lifetime: 225 },
				25: { 1: 14, 2: 25, 3: 36, 4: 45, 5: 53, lifetime: 210 },
				26: { 1: 13, 2: 23, 3: 33, 4: 42, 5: 49, lifetime: 195 },
				27: { 1: 12, 2: 22, 3: 31, 4: 38, 5: 45, lifetime: 180 },
			},
		},
		limits: {
			maxTagsPerUser: 50,
			maxTransferPerDay: 20,
			maxRenewalPerDay: 10,
		},
		metadata: {
			launchDate: "2024-04-01",
			version: "1.0.0",
			documentation: "https://docs.bdag.zelf.world",
			enterprise: "blockDAG",
			support: "enterprise",
		},
	}),
};

/**
 * Get domain configuration by domain name
 * @param {string} domain - Domain name (e.g., 'avax', 'btc')
 * @returns {Object|null} - Domain configuration or null if not found
 */
const getDomainConfig = (domain) => {
	return SUPPORTED_DOMAINS[domain.toLowerCase()] || null;
};

/**
 * Check if domain is supported
 * @param {string} domain - Domain name
 * @returns {boolean} - True if domain is supported
 */
const isSupported = (domain) => {
	return domain && SUPPORTED_DOMAINS.hasOwnProperty(domain.toLowerCase());
};

/**
 * Get all supported domains
 * @returns {Object} - All supported domains
 */
const getAllSupportedDomains = () => {
	return SUPPORTED_DOMAINS;
};

/**
 * Get domains by type
 * @param {string} type - Domain type ('official', 'custom', 'enterprise')
 * @returns {Array} - Array of domain configurations
 */
const getByType = (type) => {
	return Object.entries(SUPPORTED_DOMAINS)
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
	if (!config) {
		return { valid: false, error: "Domain not supported" };
	}

	const { validation } = config;

	// Check length
	if (name.length < validation.minLength) {
		return { valid: false, error: `Name must be at least ${validation.minLength} characters` };
	}

	if (name.length > validation.maxLength) {
		return { valid: false, error: `Name must be no more than ${validation.maxLength} characters` };
	}

	// Check allowed characters
	if (!validation.allowedChars.test(name)) {
		return { valid: false, error: "Name contains invalid characters" };
	}

	// Check reserved names
	if (validation.reserved.includes(name.toLowerCase())) {
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
	return Object.entries(SUPPORTED_DOMAINS)
		.filter(([_, config]) => config.status === "active")
		.map(([domain, config]) => ({ domain, ...config }));
};

/**
 * Get domains by owner
 * @param {string} owner - Domain owner
 * @returns {Array} - Array of domain configurations
 */
const getByOwner = (owner) => {
	return Object.entries(SUPPORTED_DOMAINS)
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

module.exports = {
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
};
