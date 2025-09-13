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
	const { domain, key, value, domainConfig } = params;

	// Get domain configuration
	const _domainConfig = domainConfig || getDomainConfiguration(domain);

	if (!_domainConfig) throw new Error("Domain not supported");

	// Search by domain-specific criteria
	const searchParams = {
		key: key || "Domain",
		value: value || domain,
	};

	return await searchInArweave(searchParams.key, searchParams.value);
};

/**
 * Search for tags by storage key
 * @param {Object} params - Search parameters
 * @param {string} params.domainConfig - Domain configuration
 * @param {string} params.tagName - Tag name
 * @returns {Array} - Search results
 */
const searchByStorageKey = async (params) => {
	const { tagName, domainConfig, domain } = params;

	const _domainConfig = domainConfig || getDomainConfiguration(domain);

	return await searchInArweave(_domainConfig.storage.keyPrefix, tagName);
};

/**
 * Search Arweave for data
 * @param {string} key - Search key
 * @param {string} value - Search value
 * @returns {Array} - Search results
 */
const searchInArweave = async (key, value) => {
	if (!key || !value) return null;

	const tagsToSearch = `[{ name: "${key}", values: "${value}" }]`;

	const query = {
		query: `
		{
			 transactions(
				tags: ${tagsToSearch},
				owners: ["${owner}"]
			) {
				edges {
					node {
						id
						owner {
							address
						}
						data {
							size
							type
						}
						tags {
							name
							value
						}
					}
				}
			}
		}
	  `,
	};

	const result = await axios.post(graphql, query, {
		headers: { "Content-Type": "application/json" },
	});

	const searchResults = result.data?.data?.transactions?.edges;

	if (!searchResults || !searchResults.length) {
		return {
			key,
			value,
			available: true,
		};
	}

	return formatSearchResults(searchResults);
};

const formatSearchResults = (searchResults) => {
	const formattedResults = [];

	for (let index = 0; index < searchResults.length; index++) {
		const searchResult = searchResults[index];

		const formattedResult = {
			id: searchResult.node.id,
			owner: searchResult.node.owner.address,
			url: `${arweaveUrl}/${searchResult.node.id}`,
			explorerUrl: `${explorerUrl}/${searchResult.node.id}`,
			publicData: {},
			size: searchResult.node.data.size,
		};

		// it should be an object with key values
		for (let _index = 0; _index < searchResult.node.tags.length; _index++) {
			const tag = searchResult.node.tags[_index];

			// for the key zelfProof we should replace al the spaces with +
			if (tag.name === "zelfProof") {
				tag.value = tag.value.replace(/ /g, "+");
			}

			formattedResult.publicData[tag.name] = tag.value;
		}

		if (formattedResult.publicData.extraParams) {
			const extraParams = JSON.parse(formattedResult.publicData.extraParams);
			Object.assign(formattedResult.publicData, extraParams);
			delete formattedResult.publicData.extraParams;
		}

		formattedResults.push(formattedResult);
	}

	return formattedResults;
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
		const domainTags = await searchInArweave("Domain", domain);

		// Get hold domains for this domain
		const holdDomains = await searchInArweave("Hold-Status", "hold");
		const domainHoldDomains = holdDomains.filter((tag) => tag.tags.some((t) => t.name === "Domain" && t.value === domain));

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
	getDomainStats,
};
