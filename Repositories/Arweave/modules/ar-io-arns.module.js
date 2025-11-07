/**
 * Module for Arweave AR-IO ARNs operations
 */

const { ARIO, ArweaveSigner, ANT } = require("@ar.io/sdk");
const config = require("../../../Core/config");
const TagsSearchModule = require("../../Tags/modules/tags-search.module");

//qNvAoz0TgcH7DMg8BCVn8jF32QH5L6T29VjHxhHqqGE
ARIO.init({ processId: config.arns.processId });

/**
 * Get AR-IO ARNs for a user
 * @param {Object} params - Query parameters
 * @param {Object} authUser - Authenticated user object
 * @returns {Promise<Object>} AR-IO ARNs data
 */
const get = async (params, authUser = {}) => {
	const { tagObject, tagName, domain } = await _validateTagName(params.zelfName.split(".")[0], params.zelfName.split(".")[1], authUser);

	const ant = _initWallet();

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

	const primaryUrl = domain === "zelf" ? `https://${tagName}_zelf.arweave.zelf.world` : `https://${tagName}_${domain}_zelf.arweave.zelf.world`;

	const secondaryUrl = domain === "zelf" ? `https://${tagName}_zelf.arweave.net` : `https://${tagName}_${domain}_zelf.arweave.net`;

	return {
		success: true,
		exists: true,
		record: record,
		upToDate: record.transactionId === config.arns.index_transaction_id,
		zelfName: tagName,
		tagName,
		domain,
		primaryUrl,
		secondaryUrl,
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

	const ant = _initWallet();

	// const owner = await ant.getOwner();

	// Get all records and search for the specific one
	const records = await ant.getRecords();

	const recordKey = domain === "zelf" ? `${tagName}` : `${tagName}_${domain}`;

	const primaryUrl = domain === "zelf" ? `https://${tagName}_zelf.arweave.zelf.world` : `https://${tagName}_${domain}_zelf.arweave.zelf.world`;

	const secondaryUrl = domain === "zelf" ? `https://${tagName}_zelf.arweave.net` : `https://${tagName}_${domain}_zelf.arweave.net`;

	if (records[recordKey] && records[recordKey].transactionId === config.arns.index_transaction_id) {
		return {
			success: true,
			exists: true,
			record: records[recordKey],
			upToDate: records[recordKey].transactionId === config.arns.index_transaction_id,
			zelfName,
			tagName,
			domain,
			primaryUrl,
			secondaryUrl,
		};
	}

	// Create the under name
	const record = await ant.setRecord(
		{
			undername: recordKey,
			transactionId: config.arns.index_transaction_id,
			ttlSeconds: 3600,
		},
		{
			tags: [],
		}
	);

	return {
		...record,
		primaryUrl,
		secondaryUrl,
	};
};

const _initWallet = () => {
	const processId = config.arns.processId;

	const walletKey = {
		kty: "RSA",
		n: config.arwave.n,
		e: config.arwave.e,
		d: config.arwave.d,
		p: config.arwave.p,
		q: config.arwave.q,
		dp: config.arwave.dp,
		dq: config.arwave.dq,
		qi: config.arwave.qi,
		kid: "2011-04-29",
	};

	// in a node environment
	const ant = ANT.init({
		signer: new ArweaveSigner(walletKey),
		processId,
	});

	return ant;
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
