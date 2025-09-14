const config = require("../../../Core/config");
/**
 * Domain Class
 *
 * This class represents a single domain configuration with all its properties
 * and methods. It's designed to work with external data sources like databases
 * or APIs where domain configurations come as JSON objects.
 */
class Domain {
	constructor(domainData) {
		// Core properties
		this.name = domainData.name || "";
		this.type = domainData.type || "custom";
		this.holdSuffix = domainData.holdSuffix || ".hold";
		this.status = domainData.status || "inactive";
		this.owner = domainData.owner || "";
		this.description = domainData.description || "";
		// Features array
		this.features = domainData.features || [];
		// Validation rules
		this.validation = {
			minLength: domainData.validation?.minLength || 3,
			maxLength: domainData.validation?.maxLength || 50,
			allowedChars: domainData.validation?.allowedChars || /^[a-zA-Z0-9][a-zA-Z0-9-]*[a-zA-Z0-9]$/,
			reserved: domainData.validation?.reserved || [],
			customRules: domainData.validation?.customRules || [],
		};

		// Storage configuration
		this.storage = {
			keyPrefix: domainData.storage?.keyPrefix || "tagName",
			ipfsEnabled: domainData.storage?.ipfsEnabled || true,
			arweaveEnabled: domainData.storage?.arweaveEnabled || true,
			backupEnabled: domainData.storage?.backupEnabled || false,
		};

		// Payment configuration
		this.payment = {
			methods: domainData.payment?.methods || ["coinbase", "crypto"],
			currencies: domainData.payment?.currencies || ["USD"],
			discounts: domainData.payment?.discounts || {
				yearly: 0.1,
				lifetime: 0.2,
			},
			rewardPrice: domainData.payment?.rewardPrice || 10,
			whitelist: domainData.payment?.whitelist || "",
			pricingTable: domainData.payment?.pricingTable || {},
		};

		// Limits
		this.limits = {
			maxTagsPerUser: domainData.limits?.maxTagsPerUser || 5,
			maxTransferPerDay: domainData.limits?.maxTransferPerDay || 3,
			maxRenewalPerDay: domainData.limits?.maxRenewalPerDay || 2,
		};

		// Metadata
		this.metadata = domainData.metadata || {};
	}

	/**
	 * Check if domain is active
	 * @returns {boolean} - True if domain is active
	 */
	isActive() {
		return this.status === "active";
	}

	/**
	 * Check if domain supports a feature
	 * @param {string} feature - Feature name
	 * @returns {boolean} - True if feature is supported
	 */
	supportsFeature(feature) {
		return this.features.includes(feature);
	}

	/**
	 * Get domain price for specific tag length and duration
	 * @param {number} tagLength - Length of tag name
	 * @param {string} duration - Duration ('1', '2', '3', '4', '5', 'lifetime')
	 * @returns {number} - Price in cents
	 */
	getPrice(tagName, duration = "1", referralTagName = "") {
		if (!tagName) {
			return {
				price: 0,
				currency: "USD",
				reward: 0,
				discount: 0,
				priceWithoutDiscount: 0,
				discountType: "percentage",
			};
		}

		const splitTagName = tagName.split(".");

		const length = splitTagName[0].length;

		if (!this.payment.pricingTable) return 0;

		if (!["1", "2", "3", "4", "5", "lifetime"].includes(`${duration}`))
			throw new Error("Invalid duration. Use '1', '2', '3', '4', '5' or 'lifetime'.");

		let price = 24;

		if (length >= 6 && length <= 15) {
			price = this.payment.pricingTable["6-15"][duration];
		} else if (this.payment.pricingTable[length]) {
			price = this.payment.pricingTable[length][duration];
		} else {
			throw new Error("Invalid name length. Length must be between 1 and 27.");
		}

		// Adjust price for development environment
		price = config.token.priceEnv === "development" ? price / 30 : price;

		const priceWithoutDiscount = Number(price);

		let discount = 10;

		let discountType = "percentage";

		const whitelist = this.payment.whitelist || {};

		if (Object.keys(whitelist).length && referralTagName && whitelist[referralTagName]) {
			const amount = whitelist[referralTagName];

			if (amount.includes("%")) {
				discountType = "percentage";
				discount = parseInt(amount);
				price = price - price * (discount / 100);
			} else {
				discount = parseInt(amount);
				discountType = "amount";
				price = price - discount;
			}
		} else if (referralTagName) {
			price = price - price * 0.1;
		}

		// Round up to 2 decimal places
		return {
			price: Math.max(Math.ceil(price * 100) / 100, 0),
			currency: "USD",
			reward: Math.max(Math.ceil((price / this.payment.rewardPrice) * 100) / 100, 0),
			discount,
			priceWithoutDiscount,
			discountType,
		};
	}

	/**
	 * Validate tag name against domain rules
	 * @param {string} tagName - Tag name to validate
	 * @returns {Object} - Validation result
	 */
	validateTagName(tagName) {
		// Check minimum length
		if (tagName.length < this.validation.minLength) {
			return {
				valid: false,
				error: `Tag name must be at least ${this.validation.minLength} characters long`,
			};
		}

		// Check maximum length
		if (tagName.length > this.validation.maxLength) {
			return {
				valid: false,
				error: `Tag name must be no more than ${this.validation.maxLength} characters long`,
			};
		}

		// Check allowed characters
		if (!this.validation.allowedChars.test(tagName)) {
			return {
				valid: false,
				error: `Tag name contains invalid characters. Allowed pattern: ${this.validation.allowedChars}`,
			};
		}

		// Check reserved names
		if (this.validation.reserved.includes(tagName.toLowerCase())) {
			return {
				valid: false,
				error: `Tag name '${tagName}' is reserved`,
			};
		}

		// Check custom rules
		for (const rule of this.validation.customRules) {
			if (typeof rule === "function") {
				const result = rule(tagName);
				if (!result.valid) {
					return result;
				}
			}
		}

		return { valid: true };
	}

	/**
	 * Generate storage key for tag
	 * @param {string} tagName - Tag name
	 * @returns {string} - Storage key
	 */
	generateStorageKey(tagName) {
		return `${this.storage.keyPrefix}_${tagName}`;
	}

	/**
	 * Generate hold domain name
	 * @param {string} tagName - Tag name
	 * @returns {string} - Hold domain name
	 */
	generateHoldDomain(tagName) {
		return `${tagName}${this.holdSuffix}.${this.name}`;
	}

	/**
	 * Check if IPFS is enabled
	 * @returns {boolean} - True if IPFS is enabled
	 */
	isIPFSEnabled() {
		return this.storage.ipfsEnabled;
	}

	/**
	 * Check if Arweave is enabled
	 * @returns {boolean} - True if Arweave is enabled
	 */
	isArweaveEnabled() {
		return this.storage.arweaveEnabled;
	}

	/**
	 * Check if backup is enabled
	 * @returns {boolean} - True if backup is enabled
	 */
	isBackupEnabled() {
		return this.storage.backupEnabled;
	}

	/**
	 * Get domain statistics
	 * @returns {Object} - Domain statistics
	 */
	getStats() {
		return {
			name: this.name,
			type: this.type,
			status: this.status,
			owner: this.owner,
			price: this.price,
			features: this.features,
			limits: this.limits,
			metadata: this.metadata,
		};
	}

	/**
	 * Convert domain to JSON object
	 * @returns {Object} - Domain as JSON
	 */
	toJSON() {
		return {
			name: this.name,
			type: this.type,
			price: this.price,
			holdSuffix: this.holdSuffix,
			status: this.status,
			owner: this.owner,
			description: this.description,
			features: this.features,
			validation: this.validation,
			storage: this.storage,
			payment: this.payment,
			limits: this.limits,
			metadata: this.metadata,
		};
	}

	/**
	 * Create domain from JSON object
	 * @param {Object} jsonData - JSON data
	 * @returns {Domain} - Domain instance
	 */
	static fromJSON(jsonData) {
		return new Domain(jsonData);
	}

	/**
	 * Create domain from database record
	 * @param {Object} dbRecord - Database record
	 * @returns {Domain} - Domain instance
	 */
	static fromDatabase(dbRecord) {
		// Handle case where domain config is stored as JSON string
		const domainData = typeof dbRecord.config === "string" ? JSON.parse(dbRecord.config) : dbRecord.config;

		return new Domain({
			name: dbRecord.domainName || dbRecord.name,
			...domainData,
		});
	}

	/**
	 * Create domain from API response
	 * @param {Object} apiResponse - API response data
	 * @returns {Domain} - Domain instance
	 */
	static fromAPI(apiResponse) {
		return new Domain(apiResponse);
	}

	/**
	 * Get the tag key for this domain
	 * @returns {string} - The tag key (storage.keyPrefix)
	 */
	getTagKey() {
		return this.storage.keyPrefix;
	}
}

/**
 * Domain Factory Class
 *
 * This class manages multiple domains and provides methods to create
 * domain instances from various external sources (database, API, JSON, etc.)
 */
class DomainFactory {
	constructor() {
		this.domains = new Map();
	}

	/**
	 * Create domain from JSON data
	 * @param {Object} domainData - Domain data object
	 * @returns {Domain} - Domain instance
	 */
	createFromJSON(domainData) {
		const domain = Domain.fromJSON(domainData);
		this.domains.set(domain.name, domain);
		return domain;
	}

	/**
	 * Create domain from database record
	 * @param {Object} dbRecord - Database record
	 * @returns {Domain} - Domain instance
	 */
	createFromDatabase(dbRecord) {
		const domain = Domain.fromDatabase(dbRecord);
		this.domains.set(domain.name, domain);
		return domain;
	}

	/**
	 * Create domain from API response
	 * @param {Object} apiResponse - API response data
	 * @returns {Domain} - Domain instance
	 */
	createFromAPI(apiResponse) {
		const domain = Domain.fromAPI(apiResponse);
		this.domains.set(domain.name, domain);
		return domain;
	}

	/**
	 * Create multiple domains from array of data
	 * @param {Array} domainsData - Array of domain data objects
	 * @returns {Array} - Array of Domain instances
	 */
	createMultiple(domainsData) {
		return domainsData.map((data) => this.createFromJSON(data));
	}

	/**
	 * Get domain by name
	 * @param {string} name - Domain name
	 * @returns {Domain|null} - Domain instance or null
	 */
	getDomain(name) {
		return this.domains.get(name) || null;
	}

	/**
	 * Check if domain exists
	 * @param {string} name - Domain name
	 * @returns {boolean} - True if domain exists
	 */
	hasDomain(name) {
		return this.domains.has(name);
	}

	/**
	 * Remove domain
	 * @param {string} name - Domain name
	 * @returns {boolean} - True if domain was removed
	 */
	removeDomain(name) {
		return this.domains.delete(name);
	}

	/**
	 * Update domain
	 * @param {string} name - Domain name
	 * @param {Object} updates - Updates to apply
	 * @returns {Domain|null} - Updated domain or null
	 */
	updateDomain(name, updates) {
		const domain = this.getDomain(name);
		if (!domain) return null;

		// Update properties
		Object.keys(updates).forEach((key) => {
			if (domain.hasOwnProperty(key)) {
				domain[key] = updates[key];
			}
		});

		return domain;
	}

	/**
	 * Get domain count
	 * @returns {number} - Total number of domains
	 */
	getDomainCount() {
		return this.domains.size;
	}

	/**
	 * Import domains from JSON array
	 * @param {Array} domainsJSON - Array of domain JSON objects
	 * @returns {Array} - Array of created Domain instances
	 */
	importFromJSON(domainsJSON) {
		return domainsJSON.map((domainData) => this.createFromJSON(domainData));
	}

	/**
	 * Clear all domains
	 */
	clear() {
		this.domains.clear();
	}

	/**
	 * Reset to default domains
	 */
	reset() {
		this.clear();
	}
}

// Create singleton instance (domains will be loaded when needed)
const domainFactory = new DomainFactory();

module.exports = {
	Domain,
	DomainFactory,
	domainFactory,
};
