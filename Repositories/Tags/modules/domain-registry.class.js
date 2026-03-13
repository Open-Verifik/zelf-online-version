const { getSupportedDomains } = require("../config/supported-domains");

/**
 * Domain Registry Class
 *
 * This class provides a centralized way to manage domain configurations
 * and provides easy access to domain properties and validation methods.
 */
class DomainRegistry {
	constructor() {
		this.domains = getSupportedDomains();
	}

	/**
	 * Get domain configuration by name
	 * @param {string} domainName - Domain name (e.g., "zelf", "avax", "btc")
	 * @returns {Object|null} - Domain configuration or null if not found
	 */
	getDomain(domainName) {
		if (!domainName) return null;
		return this.domains[domainName.toLowerCase()] || null;
	}

	/**
	 * Get all supported domains
	 * @returns {Object} - All domain configurations
	 */
	getAllDomains() {
		return this.domains;
	}

	/**
	 * Get active domains only
	 * @returns {Array} - Array of active domain configurations
	 */
	getActiveDomains() {
		return Object.entries(this.domains)
			.filter(([_, config]) => config.status === "active")
			.map(([name, config]) => ({ name, ...config }));
	}

	/**
	 * Get domains by type
	 * @param {string} type - Domain type ("official", "custom", "enterprise")
	 * @returns {Array} - Array of domains of specified type
	 */
	getDomainsByType(type) {
		return Object.entries(this.domains)
			.filter(([_, config]) => config.type === type)
			.map(([name, config]) => ({ name, ...config }));
	}

	/**
	 * Get domains by owner
	 * @param {string} owner - Domain owner
	 * @returns {Array} - Array of domains owned by specified owner
	 */
	getDomainsByOwner(owner) {
		return Object.entries(this.domains)
			.filter(([_, config]) => config.owner === owner)
			.map(([name, config]) => ({ name, ...config }));
	}

	/**
	 * Check if domain is supported
	 * @param {string} domainName - Domain name to check
	 * @returns {boolean} - True if domain is supported
	 */
	isDomainSupported(domainName) {
		return this.getDomain(domainName) !== null;
	}

	/**
	 * Check if domain is active
	 * @param {string} domainName - Domain name to check
	 * @returns {boolean} - True if domain is active
	 */
	isDomainActive(domainName) {
		const domain = this.getDomain(domainName);
		return domain && domain.status === "active";
	}

	/**
	 * Get domain price
	 * @param {string} domainName - Domain name
	 * @returns {number} - Domain price in cents
	 */
	getDomainPrice(domainName) {
		const domain = this.getDomain(domainName);
		return domain ? domain.price : 0;
	}

	/**
	 * Check if domain supports a feature
	 * @param {string} domainName - Domain name
	 * @param {string} feature - Feature name
	 * @returns {boolean} - True if domain supports the feature
	 */
	supportsFeature(domainName, feature) {
		const domain = this.getDomain(domainName);
		return domain && domain.features && domain.features.includes(feature);
	}

	/**
	 * Get domain storage configuration
	 * @param {string} domainName - Domain name
	 * @returns {Object} - Storage configuration
	 */
	getStorageConfig(domainName) {
		const domain = this.getDomain(domainName);
		return domain ? domain.storage : null;
	}

	/**
	 * Generate storage key for domain
	 * @param {string} domainName - Domain name
	 * @param {string} tagName - Tag name
	 * @returns {string} - Storage key
	 */
	generateStorageKey(domainName, tagName) {
		const domain = this.getDomain(domainName);
		if (!domain || !domain.storage) return null;

		const keyPrefix = domain.storage.keyPrefix || "tagName";
		return `${keyPrefix}_${tagName}`;
	}

	/**
	 * Generate hold domain name
	 * @param {string} domainName - Domain name
	 * @param {string} tagName - Tag name
	 * @returns {string} - Hold domain name
	 */
	generateHoldDomain(domainName, tagName) {
		const domain = this.getDomain(domainName);
		if (!domain) return null;

		const holdSuffix = domain.holdSuffix || ".hold";
		return `${tagName}${holdSuffix}`;
	}

	/**
	 * Get domain payment methods
	 * @param {string} domainName - Domain name
	 * @returns {Array} - Available payment methods
	 */
	getPaymentMethods(domainName) {
		const domain = this.getDomain(domainName);
		return domain && domain.payment ? domain.payment.methods : [];
	}

	/**
	 * Get domain currencies
	 * @param {string} domainName - Domain name
	 * @returns {Array} - Supported currencies
	 */
	getCurrencies(domainName) {
		const domain = this.getDomain(domainName);
		return domain && domain.payment ? domain.payment.currencies : [];
	}

	/**
	 * Get domain limits
	 * @param {string} domainName - Domain name
	 * @returns {Object} - Domain limits
	 */
	getLimits(domainName) {
		const domain = this.getDomain(domainName);
		return domain && domain.limits ? domain.limits : {};
	}

	/**
	 * Get domain validation rules
	 * @param {string} domainName - Domain name
	 * @returns {Object} - Validation rules
	 */
	getValidationRules(domainName) {
		const domain = this.getDomain(domainName);
		return domain && domain.validation ? domain.validation : {};
	}

	/**
	 * Validate domain name format
	 * @param {string} domainName - Domain name
	 * @param {string} tagName - Tag name to validate
	 * @returns {Object} - Validation result
	 */
	validateTagName(domainName, tagName) {
		const domain = this.getDomain(domainName);
		if (!domain) {
			return { valid: false, error: `Domain '${domainName}' is not supported` };
		}

		const rules = domain.validation;
		if (!rules) {
			return { valid: true };
		}

		// Check minimum length
		if (rules.minLength && tagName.length < rules.minLength) {
			return {
				valid: false,
				error: `Tag name must be at least ${rules.minLength} characters long`,
			};
		}

		// Check maximum length
		if (rules.maxLength && tagName.length > rules.maxLength) {
			return {
				valid: false,
				error: `Tag name must be no more than ${rules.maxLength} characters long`,
			};
		}

		// Check allowed characters
		if (rules.allowedChars && !rules.allowedChars.test(tagName)) {
			return {
				valid: false,
				error: `Tag name contains invalid characters. Allowed pattern: ${rules.allowedChars}`,
			};
		}

		// Check reserved names
		if (rules.reserved && rules.reserved.includes(tagName.toLowerCase())) {
			return {
				valid: false,
				error: `Tag name '${tagName}' is reserved`,
			};
		}

		// Check custom rules
		if (rules.customRules && Array.isArray(rules.customRules)) {
			for (const rule of rules.customRules) {
				if (typeof rule === "function") {
					const result = rule(tagName);
					if (!result.valid) {
						return result;
					}
				}
			}
		}

		return { valid: true };
	}

	/**
	 * Get domain metadata
	 * @param {string} domainName - Domain name
	 * @returns {Object} - Domain metadata
	 */
	getMetadata(domainName) {
		const domain = this.getDomain(domainName);
		return domain && domain.metadata ? domain.metadata : {};
	}

	/**
	 * Get domain features
	 * @param {string} domainName - Domain name
	 * @returns {Array} - Available features
	 */
	getFeatures(domainName) {
		const domain = this.getDomain(domainName);
		return domain && domain.features ? domain.features : [];
	}

	/**
	 * Get domain description
	 * @param {string} domainName - Domain name
	 * @returns {string} - Domain description
	 */
	getDescription(domainName) {
		const domain = this.getDomain(domainName);
		return domain ? domain.description : "";
	}

	/**
	 * Get domain owner
	 * @param {string} domainName - Domain name
	 * @returns {string} - Domain owner
	 */
	getOwner(domainName) {
		const domain = this.getDomain(domainName);
		return domain ? domain.owner : "";
	}

	/**
	 * Get domain type
	 * @param {string} domainName - Domain name
	 * @returns {string} - Domain type
	 */
	getType(domainName) {
		const domain = this.getDomain(domainName);
		return domain ? domain.type : "";
	}

	/**
	 * Get domain status
	 * @param {string} domainName - Domain name
	 * @returns {string} - Domain status
	 */
	getStatus(domainName) {
		const domain = this.getDomain(domainName);
		return domain ? domain.status : "";
	}

	/**
	 * Get hold suffix for domain
	 * @param {string} domainName - Domain name
	 * @returns {string} - Hold suffix
	 */
	getHoldSuffix(domainName) {
		const domain = this.getDomain(domainName);
		return domain ? domain.holdSuffix || ".hold" : ".hold";
	}

	/**
	 * Get pricing table for domain
	 * @param {string} domainName - Domain name
	 * @returns {Object} - Pricing table
	 */
	getPricingTable(domainName) {
		const domain = this.getDomain(domainName);

		return domain && domain.tags?.payment ? domain.tags.payment.pricingTable : {};
	}

	/**
	 * Get discounts for domain
	 * @param {string} domainName - Domain name
	 * @returns {Object} - Discount configuration
	 */
	getDiscounts(domainName) {
		const domain = this.getDomain(domainName);
		return domain && domain.payment ? domain.payment.discounts : {};
	}

	/**
	 * Check if domain has IPFS enabled
	 * @param {string} domainName - Domain name
	 * @returns {boolean} - True if IPFS is enabled
	 */
	isIPFSEnabled(domainName) {
		const domain = this.getDomain(domainName);
		return domain && domain.storage ? domain.storage.ipfsEnabled : false;
	}

	/**
	 * Check if domain has Arweave enabled
	 * @param {string} domainName - Domain name
	 * @returns {boolean} - True if Arweave is enabled
	 */
	isArweaveEnabled(domainName) {
		const domain = this.getDomain(domainName);
		return domain && domain.storage ? domain.storage.arweaveEnabled : false;
	}

	/**
	 * Check if domain has backup enabled
	 * @param {string} domainName - Domain name
	 * @returns {boolean} - True if backup is enabled
	 */
	isBackupEnabled(domainName) {
		const domain = this.getDomain(domainName);
		return domain && domain.storage ? domain.storage.backupEnabled : false;
	}

	/**
	 * Get domain statistics
	 * @param {string} domainName - Domain name
	 * @returns {Object} - Domain statistics
	 */
	getStats(domainName) {
		const domain = this.getDomain(domainName);
		if (!domain) return null;

		return {
			name: domainName,
			type: domain.type,
			status: domain.status,
			owner: domain.owner,
			price: domain.price,
			features: domain.features || [],
			limits: domain.limits || {},
			metadata: domain.metadata || {},
		};
	}

	/**
	 * List all domain names
	 * @returns {Array} - Array of domain names
	 */
	listDomainNames() {
		return Object.keys(this.domains);
	}

	/**
	 * Get domain count
	 * @returns {number} - Total number of domains
	 */
	getDomainCount() {
		return Object.keys(this.domains).length;
	}

	/**
	 * Get active domain count
	 * @returns {number} - Number of active domains
	 */
	getActiveDomainCount() {
		return this.getActiveDomains().length;
	}
}

// Create singleton instance
const domainRegistry = new DomainRegistry();

module.exports = {
	DomainRegistry,
	domainRegistry,
	// Legacy exports for backward compatibility
	getDomainConfiguration: (domainName) => domainRegistry.getDomain(domainName),
	isDomainSupported: (domainName) => domainRegistry.isDomainSupported(domainName),
	isDomainActive: (domainName) => domainRegistry.isDomainActive(domainName),
	getAllSupportedDomains: () => domainRegistry.getAllDomains(),
	getDomainsByType: (type) => domainRegistry.getDomainsByType(type),
	getActiveDomains: () => domainRegistry.getActiveDomains(),
	getDomainsByOwner: (owner) => domainRegistry.getDomainsByOwner(owner),
	getDomainPrice: (domainName) => domainRegistry.getDomainPrice(domainName),
	supportsFeature: (domainName, feature) => domainRegistry.supportsFeature(domainName, feature),
	getDomainStorageConfig: (domainName) => domainRegistry.getStorageConfig(domainName),
	generateStorageKey: (domainName, tagName) => domainRegistry.generateStorageKey(domainName, tagName),
	generateHoldDomain: (domainName, tagName) => domainRegistry.generateHoldDomain(domainName, tagName),
	getDomainPaymentMethods: (domainName) => domainRegistry.getPaymentMethods(domainName),
	getDomainCurrencies: (domainName) => domainRegistry.getCurrencies(domainName),
	getDomainLimits: (domainName) => domainRegistry.getLimits(domainName),
	validateDomainName: (domainName, tagName) => domainRegistry.validateTagName(domainName, tagName),
};
