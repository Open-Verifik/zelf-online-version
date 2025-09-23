const TagsIPFSModule = require("./tags-ipfs.module");
const TagsArweaveModule = require("./tags-arweave.module");
const { getDomainConfiguration, isDomainActive } = require("./domain-registry.module");
const TagsPartsModule = require("./tags-parts.module");
const { QRZelfProofExtractor } = require("./qr-zelfproof-extractor.module");

/**
 * Tags Search Module
 *
 * This module handles search operations for the Tags system with multi-domain support.
 * It provides unified search functionality across IPFS and Arweave for different domain types.
 */

/**
 * Search for tags across IPFS and Arweave
 * @param {Object} params - Search parameters
 * @param {string} params.tagName - Tag name (e.g., "username.avax")
 * @param {string} params.domain - Domain name (e.g., "avax")
 * @param {string} params.key - Search key
 * @param {string} params.value - Search value
 * @param {Object} authUser - Authenticated user
 * @returns {Object} - Search results
 */
const searchTag = async (params, authUser) => {
	const { tagName, domain, key, value, domainConfig, environment, type, duration } = params;

	try {
		// Search in both IPFS and Arweave
		const [ipfsResults, arweaveResults] = await Promise.all([
			["ipfs", "all"].includes(environment) ? searchIPFS(params, authUser) : [],
			["arweave", "all"].includes(environment) && ["both", "mainnet"].includes(type) ? searchArweave(params, authUser) : [],
		]);

		// Combine results
		const combinedResults = {
			ipfs: ipfsResults,
			arweave: arweaveResults,
			available: ipfsResults.length === 0 && arweaveResults.length === 0,
			tagName: tagName,
		};

		// If results found, return the first one
		if (arweaveResults.length > 0) {
			combinedResults.tagObject = arweaveResults[0];
		} else if (ipfsResults.length > 0) {
			combinedResults.tagObject = ipfsResults[0];
		}

		if (combinedResults.available) {
			combinedResults.price = domainConfig.getPrice(tagName, duration);
		}

		if (combinedResults.tagObject && !combinedResults.tagObject?.zelfProofQRCode)
			combinedResults.tagObject.zelfProofQRCode = await TagsPartsModule.urlToBase64(combinedResults.tagObject.url);

		// Extract ZelfProof from QR code if it's not already present in metadata
		if (combinedResults.tagObject && combinedResults.tagObject.zelfProofQRCode && !combinedResults.tagObject.zelfProof) {
			try {
				const extractedZelfProof = await QRZelfProofExtractor.extractZelfProof(combinedResults.tagObject.zelfProofQRCode);

				if (extractedZelfProof && QRZelfProofExtractor.validateZelfProof(extractedZelfProof)) {
					combinedResults.tagObject.zelfProof = extractedZelfProof;
				}
			} catch (error) {
				console.error("Error extracting ZelfProof from QR code:", error);
			}
		}

		return combinedResults;
	} catch (error) {
		return {
			available: false,
			error: error.message,
			tagName: tagName,
			domain: domain,
		};
	}
};

/**
 * Search for tags in IPFS
 * @param {Object} params - Search parameters
 * @param {Object} authUser - Authenticated user
 * @returns {Array} - IPFS search results
 */
const searchIPFS = async (params, authUser) => {
	const { tagName, key, value, domainConfig, type } = params;

	if (!domainConfig?.storage?.ipfsEnabled) return [];

	const ipfsRecords = [];

	try {
		switch (type) {
			case "hold":
				ipfsRecords.push(...(await TagsIPFSModule.get({ tagName, key, value, domainConfig })));
			case "mainnet":
				ipfsRecords.push(...(await TagsIPFSModule.get({ tagName, key, value, domainConfig })));
			default:
				ipfsRecords.push(...(await TagsIPFSModule.get({ tagName, key, value, domainConfig })));

				// now also query adding .hold to the tagName
				ipfsRecords.push(...(await TagsIPFSModule.get({ tagName: `${tagName}.hold`, key, value, domainConfig })));
		}

		return ipfsRecords;
	} catch (error) {
		console.error("Error searching IPFS:", error);
		return [];
	}
};

/**
 * Search for tags in Arweave
 * @param {Object} params - Search parameters
 * @param {Object} authUser - Authenticated user
 * @returns {Array} - Arweave search results
 */
const searchArweave = async (params, authUser) => {
	try {
		const { tagName, domain, key, value, domainConfig } = params;

		// Get domain configuration
		const _domainConfig = domainConfig || getDomainConfiguration(domain);

		if (!_domainConfig?.storage?.arweaveEnabled) return [];

		// Search by different criteria
		if (tagName) {
			return await TagsArweaveModule.searchByStorageKey({ tagName, domainConfig: _domainConfig, domain });
		}

		if (key && value) {
			return await TagsArweaveModule.searchByStorageKey({ key, value, domainConfig: _domainConfig, domain });
		}

		// Search by domain
		return await TagsArweaveModule.searchByDomain({ key: "domain", value: domain, domainConfig: _domainConfig }, authUser);
	} catch (error) {
		console.error("Error searching Arweave:", error);
		return [];
	}
};

/**
 * Search for hold domains
 * @param {Object} params - Search parameters
 * @param {string} params.domain - Domain name
 * @param {string} params.name - Tag name
 * @param {Object} authUser - Authenticated user
 * @returns {Object} - Hold domain search results
 */
const searchHoldDomain = async (params, authUser) => {
	const { domain, name } = params;

	// Validate domain
	if (!isDomainActive(domain)) {
		return {
			available: false,
			error: `Domain '${domain}' is not active`,
			domain: domain,
			name: name,
		};
	}

	try {
		// Search for hold domain in both IPFS and Arweave
		const [ipfsResults, arweaveResults] = await Promise.all([
			TagsIPFSModule.getHoldDomain({ domain, name }, authUser),
			TagsArweaveModule.getHoldDomain({ domain, name }, authUser),
		]);

		// Combine results
		const combinedResults = {
			ipfs: ipfsResults,
			arweave: arweaveResults,
			available: ipfsResults.length === 0 && arweaveResults.length === 0,
			domain: domain,
			name: name,
		};

		// If results found, return the first one
		if (ipfsResults.length > 0) {
			combinedResults.holdObject = ipfsResults[0];
		} else if (arweaveResults.length > 0) {
			combinedResults.holdObject = arweaveResults[0];
		}

		return combinedResults;
	} catch (error) {
		console.error("Error searching hold domain:", error);
		return {
			available: false,
			error: error.message,
			domain: domain,
			name: name,
		};
	}
};

/**
 * Search for tags by domain
 * @param {Object} params - Search parameters
 * @param {string} params.domain - Domain name
 * @param {string} params.key - Search key
 * @param {string} params.value - Search value
 * @param {Object} authUser - Authenticated user
 * @returns {Object} - Domain search results
 */
const searchByDomain = async (params, authUser) => {
	const { domain, storage } = params;

	// Validate domain
	if (!isDomainActive(domain)) {
		return {
			available: false,
			error: `Domain '${domain}' is not active`,
			domain: domain,
		};
	}

	switch (storage) {
		case "IPFS":
			return await TagsIPFSModule.searchByDomain({ domain }, authUser);
		case "Arweave":
			return await TagsArweaveModule.searchByDomain({ domain }, authUser);
	}
};

/**
 * Search for tags by storage key
 * @param {Object} params - Search parameters
 * @param {string} params.domain - Domain name
 * @param {string} params.name - Tag name
 * @param {Object} authUser - Authenticated user
 * @returns {Object} - Storage key search results
 */
const searchByStorageKey = async (params, authUser) => {
	const { domain, name } = params;

	// Validate domain
	if (!isDomainActive(domain)) {
		return {
			available: false,
			error: `Domain '${domain}' is not active`,
			domain: domain,
			name: name,
		};
	}

	try {
		// Search in both IPFS and Arweave
		const [ipfsResults, arweaveResults] = await Promise.all([
			TagsIPFSModule.searchByStorageKey({ domain, name }, authUser),
			TagsArweaveModule.searchByStorageKey({ domain, name }, authUser),
		]);

		// Combine results
		const combinedResults = {
			ipfs: ipfsResults,
			arweave: arweaveResults,
			available: ipfsResults.length === 0 && arweaveResults.length === 0,
			domain: domain,
			name: name,
		};

		// If results found, return the first one
		if (ipfsResults.length > 0) {
			combinedResults.tagObject = ipfsResults[0];
		} else if (arweaveResults.length > 0) {
			combinedResults.tagObject = arweaveResults[0];
		}

		// Generate QR code and extract ZelfProof if needed
		if (combinedResults.tagObject && !combinedResults.tagObject?.zelfProofQRCode)
			combinedResults.tagObject.zelfProofQRCode = await TagsPartsModule.urlToBase64(combinedResults.tagObject.url);

		// Extract ZelfProof from QR code if it's not already present in metadata
		if (combinedResults.tagObject && combinedResults.tagObject.zelfProofQRCode && !combinedResults.tagObject.zelfProof) {
			const extractedZelfProof = await QRZelfProofExtractor.extractZelfProof(combinedResults.tagObject.zelfProofQRCode);
			if (extractedZelfProof && QRZelfProofExtractor.validateZelfProof(extractedZelfProof)) {
				combinedResults.tagObject.zelfProof = extractedZelfProof;
			}
		}

		return combinedResults;
	} catch (error) {
		return {
			available: false,
			error: error.message,
			domain: domain,
			name: name,
		};
	}
};

/**
 * Get domain statistics
 * @param {string} domain - Domain name
 * @param {Object} authUser - Authenticated user
 * @returns {Object} - Domain statistics
 */
const getDomainStats = async (domain, authUser) => {
	try {
		// Get statistics from both IPFS and Arweave
		const [ipfsStats, arweaveStats] = await Promise.all([
			TagsIPFSModule.getDomainStats(domain, authUser),
			TagsArweaveModule.getDomainStats(domain, authUser),
		]);

		// Combine statistics
		const combinedStats = {
			domain: domain,
			totalTags: (ipfsStats.totalTags || 0) + (arweaveStats.totalTags || 0),
			holdDomains: (ipfsStats.holdDomains || 0) + (arweaveStats.holdDomains || 0),
			activeTags: (ipfsStats.activeTags || 0) + (arweaveStats.activeTags || 0),
			ipfsStats: ipfsStats,
			arweaveStats: arweaveStats,
		};

		return combinedStats;
	} catch (error) {
		console.error("Error getting domain stats:", error);
		return {
			domain: domain,
			totalTags: 0,
			holdDomains: 0,
			activeTags: 0,
			error: error.message,
		};
	}
};

/**
 * Search for tags across all domains
 * @param {Object} params - Search parameters
 * @param {string} params.key - Search key
 * @param {string} params.value - Search value
 * @param {Object} authUser - Authenticated user
 * @returns {Object} - Cross-domain search results
 */
const searchAllDomains = async (params, authUser) => {
	const { key, value } = params;

	try {
		// Get all active domains
		const activeDomains = require("../config/supported-domains").getActiveDomains();

		// Search across all domains
		const domainSearches = activeDomains.map((domain) => searchByDomain({ domain: domain.domain, key, value }, authUser));

		const results = await Promise.all(domainSearches);

		// Combine all results
		const combinedResults = {
			domains: results,
			totalDomains: activeDomains.length,
			totalResults: results.reduce((sum, result) => sum + (result.totalResults || 0), 0),
		};

		return combinedResults;
	} catch (error) {
		console.error("Error searching all domains:", error);
		return {
			domains: [],
			totalDomains: 0,
			totalResults: 0,
			error: error.message,
		};
	}
};

module.exports = {
	searchTag,
	searchIPFS,
	searchArweave,
	searchHoldDomain,
	searchByDomain,
	searchByStorageKey,
	getDomainStats,
	searchAllDomains,
};
