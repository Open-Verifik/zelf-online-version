/**
 * Module for Arweave AR-IO ARNs operations
 */

const config = require("../../../Core/config");
const TagsSearchModule = require("../../Tags/modules/tags-search.module");
const { buildArnsUndernameUrl } = require("./arweave-gateway.module");
const { initAnt, resolveExpectedTransactionId, setAntRecord, mappingOfSites } = require("./ar-io-arns-shared.module");

const mappingOfSitesRef = mappingOfSites;

/**
 * Get AR-IO ARNs for a user
 * @param {Object} params - Query parameters
 * @param {Object} authUser - Authenticated user object
 * @returns {Promise<Object>} AR-IO ARNs data
 */
const get = async (params, authUser = {}) => {
	const { tagObject, tagName, domain } = await _validateTagName(params.zelfName.split(".")[0], params.zelfName.split(".")[1], authUser);

	const ant = initAnt();

	// Get all records and search for the specific one
	const records = await ant.getRecords();

	const recordKey = domain === "zelf" ? `${tagName}` : `${tagName}_${domain}`;

	// Find the specific record by undername
	const record = records[recordKey] || null;

	if (!record) {
		return {
			success: true,
			exists: false,
			record: null,
			zelfName: tagName,
			tagName,
			domain,
		};
	}

	const primaryUrl = buildArnsUndernameUrl(tagName, domain);

	return {
		success: true,
		exists: true,
		record: record,
		upToDate: record.transactionId === mappingOfSitesRef[domain],
		zelfName: tagName,
		tagName,
		domain,
		primaryUrl,
	};
};

/**
 * Create a new AR-IO ARN
 * @param {Object} data - ARN data to create
 * @param {Object} authUser - Authenticated user object
 * @returns {Promise<Object>} Created ARN data
 */
const create = async (data, authUser = {}) => {
	const tagName = data.zelfName.split(".")[0];
	const domain = data.zelfName.split(".")[1];

	const zelfName = await _validateTagName(data.zelfName.split(".")[0], data.zelfName.split(".")[1], authUser);

	const ant = initAnt();

	// Get all records and search for the specific one
	const records = await ant.getRecords();

	const recordKey = domain === "zelf" ? `${tagName}` : `${tagName}_${domain}`;

	const primaryUrl = buildArnsUndernameUrl(tagName, domain);

	const transactionId = resolveExpectedTransactionId(recordKey);

	if (records[recordKey] && records[recordKey].transactionId === transactionId) {
		return {
			success: true,
			exists: true,
			record: records[recordKey],
			upToDate: records[recordKey].transactionId === transactionId,
			zelfName,
			tagName,
			domain,
			primaryUrl,
		};
	}

	const record = await setAntRecord({
		ant,
		recordKey,
		transactionId,
		ttlSeconds: 3600,
	});

	return {
		...record,
		primaryUrl,
	};
};

const _validateTagName = async (tagName, domain, authUser) => {
	const tagResult = await TagsSearchModule.searchTag(
		{
			tagName,
			domain,
			environment: "all",
			type: "mainnet",
		},
		authUser
	);

	if (!tagResult.tagObject) throw new Error("404:not_found_in_arweave");

	return {
		tagObject: tagResult.tagObject,
		tagName,
		domain,
	};
};

module.exports = {
	get,
	create,
};
