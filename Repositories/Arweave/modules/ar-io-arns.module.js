/**
 * Module for Arweave AR-IO ARNs operations
 */

const { ARIO, ArweaveSigner, ANT } = require("@ar.io/sdk");
const config = require("../../../Core/config");
const ZNSSearchModule = require("../../ZelfNameService/modules/zns-search.module");

//qNvAoz0TgcH7DMg8BCVn8jF32QH5L6T29VjHxhHqqGE
ARIO.init({ processId: config.arns.processId });

/**
 * Get AR-IO ARNs for a user
 * @param {Object} params - Query parameters
 * @param {Object} authUser - Authenticated user object
 * @returns {Promise<Object>} AR-IO ARNs data
 */
const get = async (params, authUser = {}) => {
	const zelfName = await _validateZelfName(params.zelfName, authUser);

	const ant = _initWallet();

	// Get all records and search for the specific one
	const records = await ant.getRecords();

	// Find the specific record by undername
	const record = records[zelfName] || null;

	if (!record) {
		return {
			success: true,
			exists: false,
			record: null,
			zelfName,
		};
	}

	return {
		success: true,
		exists: true,
		record: record,
		upToDate: record.transactionId === config.arns.index_transaction_id,
		zelfName,
		primaryUrl: `https://${zelfName}_zelf.arweave.zelf.world`,
		secondaryUrl: `https://${zelfName}_zelf.arweave.net`,
	};
};

/**
 * Create a new AR-IO ARN
 * @param {Object} data - ARN data to create
 * @param {Object} authUser - Authenticated user object
 * @returns {Promise<Object>} Created ARN data
 */
const create = async (data, authUser = {}) => {
	const zelfName = await _validateZelfName(data.zelfName, authUser);

	const ant = _initWallet();

	// const owner = await ant.getOwner();

	// Get all records and search for the specific one
	const records = await ant.getRecords();

	if (records[zelfName] && records[zelfName].transactionId === config.arns.index_transaction_id) {
		return {
			success: true,
			exists: true,
			record: records[zelfName],
			upToDate: records[zelfName].transactionId === config.arns.index_transaction_id,
			zelfName: zelfName,
			primaryUrl: `https://${zelfName}_zelf.arweave.zelf.world`,
			secondaryUrl: `https://${zelfName}_zelf.arweave.net`,
		};
	}

	// Create the under name
	const record = await ant.setRecord(
		{
			undername: zelfName,
			transactionId: config.arns.index_transaction_id,
			ttlSeconds: 3600,
		},
		{
			tags: [],
		}
	);

	return {
		...record,
		primaryUrl: `https://${zelfName}_zelf.arweave.zelf.world`,
		secondaryUrl: `https://${zelfName}_zelf.arweave.net`,
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

const _validateZelfName = async (zelfName, authUser) => {
	if (zelfName.endsWith(".zelf")) {
		zelfName = zelfName.slice(0, -5);
	}

	const searchResult = await ZNSSearchModule.searchZelfName(
		{
			zelfName,
			environment: "arweave",
		},
		authUser
	);

	if (!searchResult.arweave.length) {
		throw new Error("404:not_found_in_arweave");
	}

	return zelfName;
};

module.exports = {
	get,
	create,
};
