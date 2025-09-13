/**
 * Domain Registry Usage Examples
 * 
 * This file demonstrates how to use the DomainRegistry class
 * in other modules and components.
 */

const { domainRegistry } = require("../modules/domain-registry.class");

// Example 1: Basic domain information
console.log("=== Basic Domain Information ===");
console.log("Available domains:", domainRegistry.listDomainNames());
console.log("Total domains:", domainRegistry.getDomainCount());
console.log("Active domains:", domainRegistry.getActiveDomainCount());

// Example 2: Get specific domain configuration
console.log("\n=== Domain Configuration ===");
const zelfConfig = domainRegistry.getDomain("zelf");
console.log("Zelf domain type:", zelfConfig.type);
console.log("Zelf domain price:", zelfConfig.price);
console.log("Zelf domain features:", zelfConfig.features);

// Example 3: Domain validation
console.log("\n=== Domain Validation ===");
const validationResult = domainRegistry.validateTagName("avax", "mytag");
console.log("Validation result for 'mytag.avax':", validationResult);

const invalidResult = domainRegistry.validateTagName("avax", "ab"); // Too short
console.log("Validation result for 'ab.avax':", invalidResult);

// Example 4: Domain features and capabilities
console.log("\n=== Domain Features ===");
console.log("Does zelf support biometric?", domainRegistry.supportsFeature("zelf", "biometric"));
console.log("Does btc support enterprise?", domainRegistry.supportsFeature("btc", "enterprise"));
console.log("AVAX features:", domainRegistry.getFeatures("avax"));

// Example 5: Storage configuration
console.log("\n=== Storage Configuration ===");
console.log("Zelf IPFS enabled:", domainRegistry.isIPFSEnabled("zelf"));
console.log("BTC Arweave enabled:", domainRegistry.isArweaveEnabled("btc"));
console.log("Tech backup enabled:", domainRegistry.isBackupEnabled("tech"));

// Example 6: Payment configuration
console.log("\n=== Payment Configuration ===");
console.log("AVAX payment methods:", domainRegistry.getPaymentMethods("avax"));
console.log("BTC currencies:", domainRegistry.getCurrencies("btc"));
console.log("Tech pricing table (1 char):", domainRegistry.getPricingTable("tech")["1"]);

// Example 7: Domain limits
console.log("\n=== Domain Limits ===");
console.log("Zelf limits:", domainRegistry.getLimits("zelf"));
console.log("BTC limits:", domainRegistry.getLimits("btc"));
console.log("Enterprise (bdag) limits:", domainRegistry.getLimits("bdag"));

// Example 8: Domain statistics
console.log("\n=== Domain Statistics ===");
console.log("Zelf stats:", domainRegistry.getStats("zelf"));
console.log("AVAX stats:", domainRegistry.getStats("avax"));

// Example 9: Filter domains by criteria
console.log("\n=== Filtered Domains ===");
console.log("Custom domains:", domainRegistry.getDomainsByType("custom").map(d => d.name));
console.log("Enterprise domains:", domainRegistry.getDomainsByType("enterprise").map(d => d.name));
console.log("Domains by zelf-team:", domainRegistry.getDomainsByOwner("zelf-team").map(d => d.name));

// Example 10: Utility functions
console.log("\n=== Utility Functions ===");
console.log("Storage key for 'mytag.avax':", domainRegistry.generateStorageKey("avax", "mytag"));
console.log("Hold domain for 'mytag.btc':", domainRegistry.generateHoldDomain("btc", "mytag"));
console.log("Hold suffix for tech:", domainRegistry.getHoldSuffix("tech"));

// Example 11: Working with domain objects
console.log("\n=== Working with Domain Objects ===");
const domains = domainRegistry.getActiveDomains();
domains.forEach(domain => {
    console.log(`${domain.name}: ${domain.description} ($${domain.price/100})`);
    console.log(`  Features: ${domain.features.join(", ")}`);
    console.log(`  Limits: ${domain.limits.maxTagsPerUser} tags per user`);
    console.log(`  Storage: IPFS=${domain.storage.ipfsEnabled}, Arweave=${domain.storage.arweaveEnabled}`);
    console.log("");
});

module.exports = {
    domainRegistry,
    // Example usage in other modules
    checkDomainSupport: (domainName) => {
        return domainRegistry.isDomainSupported(domainName);
    },
    
    validateTagForDomain: (domainName, tagName) => {
        return domainRegistry.validateTagName(domainName, tagName);
    },
    
    getDomainPricing: (domainName, tagLength, duration) => {
        const pricingTable = domainRegistry.getPricingTable(domainName);
        return pricingTable[tagLength] ? pricingTable[tagLength][duration] : null;
    },
    
    checkFeatureAccess: (domainName, feature) => {
        return domainRegistry.supportsFeature(domainName, feature);
    },
    
    getStorageConfig: (domainName) => {
        return {
            ipfs: domainRegistry.isIPFSEnabled(domainName),
            arweave: domainRegistry.isArweaveEnabled(domainName),
            backup: domainRegistry.isBackupEnabled(domainName),
            keyPrefix: domainRegistry.getStorageConfig(domainName)?.keyPrefix
        };
    }
};
