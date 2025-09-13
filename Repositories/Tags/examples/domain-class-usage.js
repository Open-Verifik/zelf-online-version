/**
 * Domain Class Usage Examples
 *
 * This file demonstrates how to use the Domain class and DomainFactory
 * with external data sources like databases, APIs, or JSON files.
 */

const { domainFactory, Domain } = require("../modules/domain.class");

console.log("=== Domain Class Usage Examples ===\n");

// Example 1: Create domain from JSON data (e.g., from API)
console.log("1. Creating domain from JSON data:");
const apiDomainData = {
	name: "solana",
	type: "custom",
	price: 150, // $1.50
	holdSuffix: ".hold",
	status: "active",
	owner: "solana-community",
	description: "Solana community domain",
	features: ["biometric", "wallet", "payment", "transfer", "renewal"],
	validation: {
		minLength: 3,
		maxLength: 25,
		allowedChars: /^[a-zA-Z0-9][a-zA-Z0-9-]*[a-zA-Z0-9]$/,
		reserved: ["www", "api", "admin", "solana", "sol"],
		customRules: [],
	},
	storage: {
		keyPrefix: "solName",
		ipfsEnabled: true,
		arweaveEnabled: true,
		backupEnabled: false,
	},
	payment: {
		methods: ["coinbase", "crypto", "wallet"],
		currencies: ["USD", "SOL", "BTC", "ETH"],
		discounts: {
			yearly: 0.2,
			lifetime: 0.4,
		},
		pricingTable: {
			1: { 1: 240, 2: 432, 3: 612, 4: 768, 5: 900, lifetime: 3600 },
			2: { 1: 120, 2: 216, 3: 306, 4: 384, 5: 450, lifetime: 1800 },
			3: { 1: 72, 2: 130, 3: 184, 4: 230, 5: 270, lifetime: 1080 },
			"6-15": { 1: 24, 2: 43, 3: 61, 4: 77, 5: 90, lifetime: 360 },
		},
	},
	limits: {
		maxTagsPerUser: 5,
		maxTransferPerDay: 3,
		maxRenewalPerDay: 2,
	},
	metadata: {
		launchDate: "2024-05-01",
		version: "1.0.0",
		documentation: "https://docs.solana.zelf.world",
		community: "solana",
	},
};

const solanaDomain = domainFactory.createFromJSON(apiDomainData);
console.log(`Created domain: ${solanaDomain.name}`);
console.log(`Type: ${solanaDomain.type}`);
console.log(`Price: $${solanaDomain.price / 100}`);
console.log(`Features: ${solanaDomain.features.join(", ")}`);
console.log(`Active: ${solanaDomain.isActive()}`);
console.log("");

// Example 2: Create domain from database record
console.log("2. Creating domain from database record:");
const dbRecord = {
	_id: "507f1f77bcf86cd799439011",
	domainName: "polygon",
	config: JSON.stringify({
		type: "custom",
		price: 80,
		holdSuffix: ".hold",
		status: "active",
		owner: "polygon-community",
		description: "Polygon community domain",
		features: ["biometric", "wallet", "payment", "transfer"],
		validation: {
			minLength: 3,
			maxLength: 30,
			allowedChars: /^[a-zA-Z0-9][a-zA-Z0-9-]*[a-zA-Z0-9]$/,
			reserved: ["www", "api", "admin", "polygon", "matic"],
			customRules: [],
		},
		storage: {
			keyPrefix: "polyName",
			ipfsEnabled: true,
			arweaveEnabled: false,
			backupEnabled: false,
		},
		payment: {
			methods: ["coinbase", "crypto", "wallet"],
			currencies: ["USD", "MATIC", "BTC", "ETH"],
			discounts: {
				yearly: 0.15,
				lifetime: 0.3,
			},
			pricingTable: {
				1: { 1: 240, 2: 432, 3: 612, 4: 768, 5: 900, lifetime: 3600 },
				2: { 1: 120, 2: 216, 3: 306, 4: 384, 5: 450, lifetime: 1800 },
				3: { 1: 72, 2: 130, 3: 184, 4: 230, 5: 270, lifetime: 1080 },
				"6-15": { 1: 24, 2: 43, 3: 61, 4: 77, 5: 90, lifetime: 360 },
			},
		},
		limits: {
			maxTagsPerUser: 4,
			maxTransferPerDay: 2,
			maxRenewalPerDay: 1,
		},
		metadata: {
			launchDate: "2024-06-01",
			version: "1.0.0",
			documentation: "https://docs.polygon.zelf.world",
			community: "polygon",
		},
	}),
	createdAt: new Date(),
	updatedAt: new Date(),
};

const polygonDomain = domainFactory.createFromDatabase(dbRecord);
console.log(`Created domain from DB: ${polygonDomain.name}`);
console.log(`Owner: ${polygonDomain.owner}`);
console.log(`IPFS enabled: ${polygonDomain.isIPFSEnabled()}`);
console.log(`Arweave enabled: ${polygonDomain.isArweaveEnabled()}`);
console.log("");

// Example 3: Working with domain properties
console.log("3. Working with domain properties:");
console.log(`Solana domain supports biometric: ${solanaDomain.supportsFeature("biometric")}`);
console.log(`Solana domain supports enterprise: ${solanaDomain.supportsFeature("enterprise")}`);

// Get pricing
const price1Char = solanaDomain.getPrice(1, "1");
const priceLifetime = solanaDomain.getPrice(1, "lifetime");
const discountedPrice = solanaDomain.getDiscountedPrice(1, "lifetime");

console.log(`Solana 1-char tag price (1 year): $${price1Char / 100}`);
console.log(`Solana 1-char tag price (lifetime): $${priceLifetime / 100}`);
console.log(`Solana 1-char tag price (lifetime with discount): $${discountedPrice / 100}`);
console.log("");

// Example 4: Domain validation
console.log("4. Domain validation:");
const validTag = solanaDomain.validateTagName("mytag");
const invalidTag = solanaDomain.validateTagName("ab"); // Too short
const reservedTag = solanaDomain.validateTagName("solana"); // Reserved

console.log(`Validation for 'mytag': ${validTag.valid ? "Valid" : "Invalid"}`);
if (!validTag.valid) console.log(`  Error: ${validTag.error}`);

console.log(`Validation for 'ab': ${invalidTag.valid ? "Valid" : "Invalid"}`);
if (!invalidTag.valid) console.log(`  Error: ${invalidTag.error}`);

console.log(`Validation for 'solana': ${reservedTag.valid ? "Valid" : "Invalid"}`);
if (!reservedTag.valid) console.log(`  Error: ${reservedTag.error}`);
console.log("");

// Example 5: Domain utilities
console.log("5. Domain utilities:");
console.log(`Storage key for 'mytag.solana': ${solanaDomain.generateStorageKey("mytag")}`);
console.log(`Hold domain for 'mytag.solana': ${solanaDomain.generateHoldDomain("mytag")}`);
console.log(`Hold suffix for solana: ${solanaDomain.holdSuffix}`);
console.log("");

// Example 6: Working with multiple domains
console.log("6. Working with multiple domains:");
console.log(`Total domains: ${domainFactory.getDomainCount()}`);
console.log(`Active domains: ${domainFactory.getActiveDomainCount()}`);

const customDomains = domainFactory.getDomainsByType("custom");
console.log(`Custom domains: ${customDomains.map((d) => d.name).join(", ")}`);

const communityDomains = domainFactory.getDomainsByOwner("avalanche-community");
console.log(`Avalanche community domains: ${communityDomains.map((d) => d.name).join(", ")}`);
console.log("");

// Example 7: Search domains
console.log("7. Search domains:");
const domainsWithBiometric = domainFactory.searchDomains({ features: ["biometric"] });
console.log(`Domains with biometric: ${domainsWithBiometric.map((d) => d.name).join(", ")}`);

const freeDomains = domainFactory.searchDomains({ price: 0 });
console.log(`Free domains: ${freeDomains.map((d) => d.name).join(", ")}`);
console.log("");

// Example 8: Export/Import
console.log("8. Export/Import:");
const exportedDomains = domainFactory.exportToJSON();
console.log(`Exported ${exportedDomains.length} domains to JSON`);

// Simulate importing from external source
const externalDomains = [
	{
		name: "ethereum",
		type: "custom",
		price: 200,
		status: "active",
		owner: "ethereum-community",
		description: "Ethereum community domain",
		features: ["biometric", "wallet", "payment", "transfer", "renewal"],
		validation: {
			minLength: 3,
			maxLength: 25,
			allowedChars: /^[a-zA-Z0-9][a-zA-Z0-9-]*[a-zA-Z0-9]$/,
			reserved: ["www", "api", "admin", "ethereum", "eth"],
			customRules: [],
		},
		storage: {
			keyPrefix: "ethName",
			ipfsEnabled: true,
			arweaveEnabled: true,
			backupEnabled: true,
		},
		payment: {
			methods: ["coinbase", "crypto", "wallet"],
			currencies: ["USD", "ETH", "BTC"],
			discounts: {
				yearly: 0.25,
				lifetime: 0.5,
			},
			pricingTable: {
				1: { 1: 240, 2: 432, 3: 612, 4: 768, 5: 900, lifetime: 3600 },
				2: { 1: 120, 2: 216, 3: 306, 4: 384, 5: 450, lifetime: 1800 },
				3: { 1: 72, 2: 130, 3: 184, 4: 230, 5: 270, lifetime: 1080 },
				"6-15": { 1: 24, 2: 43, 3: 61, 4: 77, 5: 90, lifetime: 360 },
			},
		},
		limits: {
			maxTagsPerUser: 8,
			maxTransferPerDay: 4,
			maxRenewalPerDay: 3,
		},
		metadata: {
			launchDate: "2024-07-01",
			version: "1.0.0",
			documentation: "https://docs.ethereum.zelf.world",
			community: "ethereum",
		},
	},
];

const importedDomains = domainFactory.importFromJSON(externalDomains);
console.log(`Imported ${importedDomains.length} domains from external source`);
console.log(`New total domains: ${domainFactory.getDomainCount()}`);
console.log("");

// Example 9: Domain statistics
console.log("9. Domain statistics:");
const allDomains = domainFactory.getAllDomains();
allDomains.forEach((domain) => {
	const stats = domain.getStats();
	console.log(`${stats.name}: ${stats.description} ($${stats.price / 100}) - ${stats.features.length} features`);
});

module.exports = {
	domainFactory,
	Domain,
	// Example usage functions
	createDomainFromAPI: (apiData) => domainFactory.createFromAPI(apiData),
	createDomainFromDB: (dbRecord) => domainFactory.createFromDatabase(dbRecord),
	getDomainInfo: (name) => {
		const domain = domainFactory.getDomain(name);
		return domain ? domain.getStats() : null;
	},
	validateTagForDomain: (domainName, tagName) => {
		const domain = domainFactory.getDomain(domainName);
		return domain ? domain.validateTagName(tagName) : { valid: false, error: "Domain not found" };
	},
	getDomainPricing: (domainName, tagLength, duration) => {
		const domain = domainFactory.getDomain(domainName);
		return domain ? domain.getPrice(tagLength, duration) : 0;
	},
};
