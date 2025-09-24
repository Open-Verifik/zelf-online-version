const IPFS = require("../../../Core/ipfs");
const config = require("../../../Core/config");
const { getDomainConfig } = require("../config/supported-domains");
const { generateStorageKey } = require("./domain-registry.module");

/**
 * Tags IPFS Module
 *
 * This module handles IPFS operations for the Tags system with multi-domain support.
 * It extends the existing IPFS functionality to work with different domain types
 * and .hold states while maintaining compatibility with existing ZNS logic.
 */

/**
 * Get tag data from IPFS
 * @param {Object} data - Search parameters
 * @param {string} data.tagName - Tag name (e.g., "username.avax")
 * @param {string} data.domain - Domain name (e.g., "avax")
 * @param {string} data.key - Search key
 * @param {string} data.value - Search value
 * @param {string} data.cid - IPFS CID
 * @param {string} data.expires - Expiration date
 * @returns {Object} - IPFS data
 */
const get = async (data) => {
	const { cid, tagName, domain, key, value, expires, domainConfig } = data;

	if (cid) return await IPFS.retrieve(cid, expires);

	let result = [];

	if (tagName) {
		// Generate domain-specific storage key

		const storageKey = domainConfig ? domainConfig.storage.keyPrefix : generateStorageKey(domain);

		console.log({ storageKey, tagName });

		result = await IPFS.filter(storageKey, tagName);
	} else if (key && value) {
		result = await IPFS.filter(key, value);
	}

	return _formatSearchResults(result);
};

const _formatRecord = (item) => {
	const formattedResult = {
		id: item.id || item.ID,
		url: item.url,
		ipfs_pin_hash: item.ipfs_pin_hash || item.ipfsHash || item.cid,
		ipfsHash: item.ipfs_pin_hash || item.ipfsHash || item.cid,
		cid: item.ipfs_pin_hash || item.ipfsHash || item.cid,
		size: item.size || item.PinSize,
		user_id: item.user_id,
		date_pinned: item.date_pinned || item.Timestamp || item.created_at,
		date_unpinned: item.date_unpinned,
		publicData: item.publicData || item.metadata?.keyvalues || item.metadata || item.keyvalues,
	};

	if (formattedResult?.publicData?.extraParams) {
		const extraParams = JSON.parse(formattedResult.publicData.extraParams);

		Object.assign(formattedResult.publicData, extraParams);

		delete formattedResult.publicData.extraParams;
	}

	return formattedResult;
};

const _formatSearchResults = (result) => {
	const formattedResults = [];

	for (let index = 0; index < result.length; index++) {
		const item = result[index];

		formattedResults.push(_formatRecord(item));
	}

	return formattedResults;
};

/**
 * Show tag file from IPFS
 * @param {Object} data - File parameters
 * @param {string} data.cid - IPFS CID
 * @param {Object} authUser - Authenticated user
 * @returns {Object} - IPFS file data
 */
const show = async (data, authUser) => {
	const { cid } = data;

	try {
		const file = await IPFS.retrieve(cid);
		return file;
	} catch (exception) {
		const error = new Error("file_not_found");
		error.status = 404;
		throw error;
	}
};

/**
 * Insert tag data into IPFS
 * @param {Object} data - Tag data
 * @param {string} data.base64 - Base64 encoded data
 * @param {Object} data.metadata - Tag metadata
 * @param {string} data.name - Tag name
 * @param {boolean} data.pinIt - Whether to pin the file
 * @param {string} data.domain - Domain name
 * @param {Object} authUser - Authenticated user
 * @returns {Object} - IPFS upload result
 */
const insert = async (data, authUser) => {
	const { base64, metadata, name, pinIt } = data;

	if ((authUser.pro || config.env === "development") && pinIt) return await IPFS.pinFile(base64, name, null, metadata);

	return await IPFS.upload(base64, name, null, metadata);
};

/**
 * Insert tag data into IPFS
 * @param {Object} data - Tag data
 * @param {string} data.base64 - Base64 encoded data
 * @param {Object} data.metadata - Tag metadata
 * @param {string} data.name - Tag name
 * @param {boolean} data.pinIt - Whether to pin the file
 * @param {string} data.domain - Domain name
 * @param {Object} authUser - Authenticated user
 * @returns {Object} - IPFS upload result
 */
const tagRegistration = async (data, authUser) => {
	const { base64, metadata, name, pinIt } = data;

	let record = null;
	if ((authUser.pro || config.env === "development") && pinIt) {
		record = await IPFS.pinFile(base64, name, null, metadata);
	} else {
		record = await IPFS.upload(base64, name, null, metadata);
	}

	return _formatRecord(record);
};

/**
 * Unpin tag files from IPFS
 * @param {Array} CIDs - Array of IPFS CIDs to unpin
 * @returns {Object} - Unpin result
 */
const unPinFiles = async (CIDs = []) => {
	try {
		const unpinnedFiles = await IPFS.unPinFiles(CIDs);

		return unpinnedFiles;
	} catch (exception) {}

	return null;
};

/**
 * Search for tags by domain
 * @param {Object} params - Search parameters
 * @param {string} params.domain - Domain name
 * @param {Object} authUser - Authenticated user
 * @returns {Array} - Search results
 */
const searchByDomain = async (params, authUser) => {
	const { domain } = params;

	const domainConfig = getDomainConfig(domain);

	if (!domainConfig) throw new Error("Domain not supported");

	return await IPFS.filter("domain", domain);
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

	return await IPFS.filter("storageKey", storageKey);
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
	return await IPFS.filter("name", holdDomain);
};

/**
 * Insert hold domain data
 * @param {Object} data - Hold domain data
 * @param {string} data.base64 - Base64 encoded data
 * @param {Object} data.metadata - Hold domain metadata
 * @param {string} data.name - Tag name
 * @param {string} data.domain - Domain name
 * @param {boolean} data.pinIt - Whether to pin the file
 * @param {Object} authUser - Authenticated user
 * @returns {Object} - IPFS upload result
 */
const insertHoldDomain = async (data, authUser) => {
	const { base64, metadata, name, domain, pinIt } = data;

	// Get domain configuration
	const domainConfig = getDomainConfiguration(domain);
	const holdSuffix = domainConfig?.holdSuffix || ".hold";

	// Generate hold domain name
	const holdDomain = `${name}${holdSuffix}.${domain}`;

	// Generate storage key for hold domain
	const storageKey = generateStorageKey(domain, `${name}${holdSuffix}`);

	// Enhanced metadata for hold domain
	const enhancedMetadata = {
		...metadata,
		storageKey,
		domain,
		holdDomain,
		holdSuffix,
		domainConfig: domainConfig?.type || "custom",
		timestamp: new Date().toISOString(),
		status: "hold",
	};

	// Check if user has pro access or is in development
	if ((authUser.pro || config.env === "development") && pinIt) {
		return await IPFS.pinFile(base64, holdDomain, null, enhancedMetadata);
	}

	return await IPFS.upload(base64, holdDomain, null, enhancedMetadata);
};

/**
 * Update tag data in IPFS
 * @param {Object} data - Tag data
 * @param {string} data.base64 - Base64 encoded data
 * @param {Object} data.metadata - Tag metadata
 * @param {string} data.name - Tag name
 * @param {string} data.domain - Domain name
 * @param {boolean} data.pinIt - Whether to pin the file
 * @param {Object} authUser - Authenticated user
 * @returns {Object} - IPFS upload result
 */
const update = async (data, authUser) => {
	const { base64, metadata, name, domain, pinIt } = data;

	// Get domain configuration
	const domainConfig = getDomainConfiguration(domain);

	// Generate domain-specific storage key
	const storageKey = generateStorageKey(domain, name);

	// Enhanced metadata with update information
	const enhancedMetadata = {
		...metadata,
		storageKey,
		domain,
		domainConfig: domainConfig?.type || "custom",
		timestamp: new Date().toISOString(),
		updatedAt: new Date().toISOString(),
	};

	// Check if user has pro access or is in development
	if ((authUser.pro || config.env === "development") && pinIt) {
		return await IPFS.pinFile(base64, `${name}.${domain}`, null, enhancedMetadata);
	}

	return await IPFS.upload(base64, `${name}.${domain}`, null, enhancedMetadata);
};

/**
 * Delete tag data from IPFS
 * @param {Object} params - Delete parameters
 * @param {string} params.cid - IPFS CID to delete
 * @param {Object} authUser - Authenticated user
 * @returns {Object} - Delete result
 */
const deleteTag = async (params, authUser) => {
	const { cid } = params;

	try {
		// Unpin the file first
		await unPinFiles([cid]);

		return { success: true, cid };
	} catch (exception) {
		console.error("Error deleting tag:", exception);
		return { success: false, error: exception.message };
	}
};

/**
 * Get domain statistics from IPFS
 * @param {string} domain - Domain name
 * @param {Object} authUser - Authenticated user
 * @returns {Object} - Domain statistics
 */
const getDomainStats = async (domain, authUser) => {
	try {
		// Get all tags for this domain
		const domainTags = await IPFS.filter("domain", domain);

		// Get hold domains for this domain
		const holdDomains = await IPFS.filter("holdSuffix", ".hold");
		const domainHoldDomains = holdDomains.filter((tag) => tag.metadata?.domain === domain);

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

const deleteFiles = async (ids = []) => {
	try {
		const deletedFiles = await IPFS.deleteFiles(ids);

		return deletedFiles;
	} catch (exception) {
		console.error("Error deleting files:", exception);
	}

	return null;
};

module.exports = {
	get,
	show,
	insert,
	tagRegistration,
	unPinFiles,
	searchByDomain,
	searchByStorageKey,
	getHoldDomain,
	insertHoldDomain,
	update,
	deleteTag,
	getDomainStats,
	formatResults: _formatSearchResults,
	formatRecord: _formatRecord,
	deleteFiles,
};
