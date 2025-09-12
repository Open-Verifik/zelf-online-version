/**
 * Supported Domains Configuration
 * This file defines all supported domain types and their configurations
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
	zelf: {
		type: "official",
		price: 0,
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
	},

	// Avalanche community domain
	avax: {
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
	},

	// Bitcoin community domain
	btc: {
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
	},

	// Tech community domain
	tech: {
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
	},

	// Enterprise domain example
	bdag: {
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
	},
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
const isDomainSupported = (domain) => {
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
const getDomainsByType = (type) => {
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
const getDomainsByOwner = (owner) => {
	return Object.entries(SUPPORTED_DOMAINS)
		.filter(([_, config]) => config.owner === owner)
		.map(([domain, config]) => ({ domain, ...config }));
};

/**
 * Get domain price with discounts
 * @param {string} domain - Domain name
 * @param {string} duration - Duration ('yearly', 'lifetime')
 * @returns {number} - Price in cents
 */
const getDomainPrice = (domain, duration = "yearly") => {
	const config = getDomainConfig(domain);
	if (!config) return 0;

	const basePrice = config.price;
	const discount = config.payment?.discounts?.[duration] || 0;

	return Math.round(basePrice * (1 - discount));
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
 * Generate storage key for domain
 * @param {string} domain - Domain name
 * @param {string} name - Tag name
 * @returns {string} - Storage key
 */
const generateStorageKey = (domain, name) => {
	const storageConfig = getDomainStorageConfig(domain);
	return `${storageConfig.keyPrefix}:${name}:${domain}`;
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
};
