const { TurboFactory, USD, WinstonToTokenAmount, productionTurboConfiguration } = require("@ardrive/turbo-sdk");
const Arweave = require("arweave");
const fs = require("fs");
const path = require("path");
const config = require("../../../Core/config");
const axios = require("axios");
const { getDomainConfiguration, generateStorageKey } = require("./domain-registry.module");

const arweaveUrl = `https://arweave.zelf.world`;
const explorerUrl = `https://viewblock.io/arweave/tx`;

const owner = config.arwave.env === "development" ? config.arwave.hold.owner : config.arwave.owner;

const graphql = `${arweaveUrl}/graphql`;

/**
 * Tags Arweave Module
 * 
 * This module handles Arweave operations for the Tags system with multi-domain support.
 * It extends the existing Arweave functionality to work with different domain types
 * and .hold states while maintaining compatibility with existing ZNS logic.
 */

/**
 * Register tag on Arweave
 * @param {string} tagProofQRCode - Tag proof QR code
 * @param {Object} tagObject - Tag object data
 * @param {string} domain - Domain name
 * @returns {Object} - Arweave registration result
 */
const tagRegistration = async (tagProofQRCode, tagObject, domain) => {
	const { zelfProof, hasPassword, publicData } = tagObject;

	const env = config.arwave.env;

	/**
	 * Generate a key from the arweave wallet.
	 */
	const jwk = {
		kty: "RSA",
		n: env === "development" ? config.arwave.hold.n : config.arwave.n,
		e: env === "development" ? config.arwave.hold.e : config.arwave.e,
		d: env === "development" ? config.arwave.hold.d : config.arwave.d,
		p: env === "development" ? config.arwave.hold.p : config.arwave.p,
		q: env === "development" ? config.arwave.hold.q : config.arwave.q,
		dp: env === "development" ? config.arwave.hold.dp : config.arwave.dp,
		dq: env === "development" ? config.arwave.hold.dq : config.arwave.dq,
		qi: env === "development" ? config.arwave.hold.qi : config.arwave.qi,
		kid: "2011-04-29",
	};

	/**
	 * Use the arweave key to create an authenticated turbo client
	 */
	const turboAuthClient = TurboFactory.authenticated({
		privateKey: jwk,
		...productionTurboConfiguration,
	});

	// Convert base64 string to a buffer
	const base64Data = tagProofQRCode.split(",")[1];
	const buffer = Buffer.from(base64Data, "base64");

	// Get domain configuration
	const domainConfig = getDomainConfiguration(domain);
	const storageKey = generateStorageKey(domain, publicData.tagName);

	// Enhanced metadata with domain information
	const enhancedMetadata = {
		...publicData,
		storageKey,
		domain,
		domainConfig: domainConfig?.type || "custom",
		timestamp: new Date().toISOString(),
		arweaveOwner: owner,
	};

	// Create the data item
	const dataItem = await turboAuthClient.createDataItem({
		data: buffer,
		tags: [
			{ name: "Content-Type", value: "image/png" },
			{ name: "App-Name", value: "zelf-tags" },
			{ name: "App-Version", value: "1.0.0" },
			{ name: "Tag-Name", value: publicData.tagName },
			{ name: "Domain", value: domain },
			{ name: "Storage-Key", value: storageKey },
			{ name: "Domain-Type", value: domainConfig?.type || "custom" },
			{ name: "Timestamp", value: new Date().toISOString() },
		],
	});

	// Upload the data item
	const uploadResult = await turboAuthClient.uploadDataItem(dataItem);

	return {
		...uploadResult,
		url: `${arweaveUrl}/${uploadResult.id}`,
		explorerUrl: `${explorerUrl}/${uploadResult.id}`,
		metadata: enhancedMetadata,
	};
};

/**
 * Register hold domain on Arweave
 * @param {string} tagProofQRCode - Tag proof QR code
 * @param {Object} tagObject - Tag object data
 * @param {string} domain - Domain name
 * @param {string} name - Tag name
 * @returns {Object} - Arweave registration result
 */
const holdDomainRegistration = async (tagProofQRCode, tagObject, domain, name) => {
	const { zelfProof, hasPassword, publicData } = tagObject;

	const env = config.arwave.env;

	/**
	 * Generate a key from the arweave wallet.
	 */
	const jwk = {
		kty: "RSA",
		n: env === "development" ? config.arwave.hold.n : config.arwave.n,
		e: env === "development" ? config.arwave.hold.e : config.arwave.e,
		d: env === "development" ? config.arwave.hold.d : config.arwave.d,
		p: env === "development" ? config.arwave.hold.p : config.arwave.p,
		q: env === "development" ? config.arwave.hold.q : config.arwave.q,
		dp: env === "development" ? config.arwave.hold.dp : config.arwave.dp,
		dq: env === "development" ? config.arwave.hold.dq : config.arwave.dq,
		qi: env === "development" ? config.arwave.hold.qi : config.arwave.qi,
		kid: "2011-04-29",
	};

	/**
	 * Use the arweave key to create an authenticated turbo client
	 */
	const turboAuthClient = TurboFactory.authenticated({
		privateKey: jwk,
		...productionTurboConfiguration,
	});

	// Convert base64 string to a buffer
	const base64Data = tagProofQRCode.split(",")[1];
	const buffer = Buffer.from(base64Data, "base64");

	// Get domain configuration
	const domainConfig = getDomainConfiguration(domain);
	const holdSuffix = domainConfig?.holdSuffix || ".hold";
	const holdDomain = `${name}${holdSuffix}.${domain}`;
	const storageKey = generateStorageKey(domain, `${name}${holdSuffix}`);

	// Enhanced metadata for hold domain
	const enhancedMetadata = {
		...publicData,
		storageKey,
		domain,
		holdDomain,
		holdSuffix,
		domainConfig: domainConfig?.type || "custom",
		timestamp: new Date().toISOString(),
		arweaveOwner: owner,
		status: "hold",
	};

	// Create the data item
	const dataItem = await turboAuthClient.createDataItem({
		data: buffer,
		tags: [
			{ name: "Content-Type", value: "image/png" },
			{ name: "App-Name", value: "zelf-tags" },
			{ name: "App-Version", value: "1.0.0" },
			{ name: "Tag-Name", value: holdDomain },
			{ name: "Domain", value: domain },
			{ name: "Storage-Key", value: storageKey },
			{ name: "Domain-Type", value: domainConfig?.type || "custom" },
			{ name: "Hold-Status", value: "hold" },
			{ name: "Timestamp", value: new Date().toISOString() },
		],
	});

	// Upload the data item
	const uploadResult = await turboAuthClient.uploadDataItem(dataItem);

	return {
		...uploadResult,
		url: `${arweaveUrl}/${uploadResult.id}`,
		explorerUrl: `${explorerUrl}/${uploadResult.id}`,
		metadata: enhancedMetadata,
	};
};

/**
 * Insert tag data into Arweave
 * @param {Object} data - Tag data
 * @param {string} data.base64 - Base64 encoded data
 * @param {Object} data.metadata - Tag metadata
 * @param {string} data.name - Tag name
 * @param {string} data.domain - Domain name
 * @param {Object} authUser - Authenticated user
 * @returns {Object} - Arweave upload result
 */
const insert = async (data, authUser) => {
	const { base64, metadata, name, domain } = data;
	
	// Get domain configuration
	const domainConfig = getDomainConfiguration(domain);
	const storageKey = generateStorageKey(domain, name);

	// Enhanced metadata with domain information
	const enhancedMetadata = {
		...metadata,
		storageKey,
		domain,
		domainConfig: domainConfig?.type || "custom",
		timestamp: new Date().toISOString(),
		arweaveOwner: owner,
	};

	// Create the data item
	const dataItem = await turboAuthClient.createDataItem({
		data: Buffer.from(base64, "base64"),
		tags: [
			{ name: "Content-Type", value: "application/json" },
			{ name: "App-Name", value: "zelf-tags" },
			{ name: "App-Version", value: "1.0.0" },
			{ name: "Tag-Name", value: `${name}.${domain}` },
			{ name: "Domain", value: domain },
			{ name: "Storage-Key", value: storageKey },
			{ name: "Domain-Type", value: domainConfig?.type || "custom" },
			{ name: "Timestamp", value: new Date().toISOString() },
		],
	});

	// Upload the data item
	const uploadResult = await turboAuthClient.uploadDataItem(dataItem);

	return {
		...uploadResult,
		url: `${arweaveUrl}/${uploadResult.id}`,
		explorerUrl: `${explorerUrl}/${uploadResult.id}`,
		metadata: enhancedMetadata,
	};
};

/**
 * Search for tags by domain
 * @param {Object} params - Search parameters
 * @param {string} params.domain - Domain name
 * @param {string} params.key - Search key
 * @param {string} params.value - Search value
 * @param {Object} authUser - Authenticated user
 * @returns {Array} - Search results
 */
const searchByDomain = async (params, authUser) => {
	const { domain, key, value } = params;
	
	// Get domain configuration
	const domainConfig = getDomainConfiguration(domain);
	if (!domainConfig) {
		throw new Error("Domain not supported");
	}

	// Search by domain-specific criteria
	const searchParams = {
		key: key || "Domain",
		value: value || domain,
	};

	return await searchArweave(searchParams.key, searchParams.value);
};

/**
 * Search for tags by storage key
 * @param {Object} params - Search parameters
 * @param {string} params.domain - Domain name
 * @param {string} params.name - Tag name
 * @param {Object} authUser - Authenticated user
 * @returns {Array} - Search results
 */
const searchByStorageKey = async (params, authUser) => {
	const { domain, name } = params;
	
	// Generate domain-specific storage key
	const storageKey = generateStorageKey(domain, name);
	
	return await searchArweave("Storage-Key", storageKey);
};

/**
 * Get hold domain data
 * @param {Object} params - Search parameters
 * @param {string} params.domain - Domain name
 * @param {string} params.name - Tag name
 * @param {Object} authUser - Authenticated user
 * @returns {Array} - Hold domain data
 */
const getHoldDomain = async (params, authUser) => {
	const { domain, name } = params;
	
	// Get domain configuration
	const domainConfig = getDomainConfiguration(domain);
	const holdSuffix = domainConfig?.holdSuffix || ".hold";
	
	// Generate hold domain name
	const holdDomain = `${name}${holdSuffix}.${domain}`;
	
	// Search for hold domain data
	return await searchArweave("Tag-Name", holdDomain);
};

/**
 * Search Arweave for data
 * @param {string} key - Search key
 * @param {string} value - Search value
 * @returns {Array} - Search results
 */
const searchArweave = async (key, value) => {
	try {
		const query = `
			query {
				transactions(
					first: 100,
					tags: [
						{ name: "App-Name", values: ["zelf-tags"] },
						{ name: "${key}", values: ["${value}"] }
					]
				) {
					edges {
						node {
							id
							tags {
								name
								value
							}
							data {
								size
							}
						}
					}
				}
			}
		`;

		const response = await axios.post(graphql, { query });
		const transactions = response.data.data.transactions.edges;

		return transactions.map(edge => ({
			id: edge.node.id,
			url: `${arweaveUrl}/${edge.node.id}`,
			explorerUrl: `${explorerUrl}/${edge.node.id}`,
			tags: edge.node.tags,
			size: edge.node.data.size,
		}));
	} catch (error) {
		console.error("Error searching Arweave:", error);
		return [];
	}
};

/**
 * Get domain statistics from Arweave
 * @param {string} domain - Domain name
 * @param {Object} authUser - Authenticated user
 * @returns {Object} - Domain statistics
 */
const getDomainStats = async (domain, authUser) => {
	try {
		// Get all tags for this domain
		const domainTags = await searchArweave("Domain", domain);
		
		// Get hold domains for this domain
		const holdDomains = await searchArweave("Hold-Status", "hold");
		const domainHoldDomains = holdDomains.filter(tag => 
			tag.tags.some(t => t.name === "Domain" && t.value === domain)
		);
		
		return {
			domain,
			totalTags: domainTags.length,
			holdDomains: domainHoldDomains.length,
			activeTags: domainTags.length - domainHoldDomains.length,
		};
	} catch (exception) {
		console.error("Error getting domain stats:", exception);
		return {
			domain,
			totalTags: 0,
			holdDomains: 0,
			activeTags: 0,
		};
	}
};

module.exports = {
	tagRegistration,
	holdDomainRegistration,
	insert,
	searchByDomain,
	searchByStorageKey,
	getHoldDomain,
	getDomainStats,
};
