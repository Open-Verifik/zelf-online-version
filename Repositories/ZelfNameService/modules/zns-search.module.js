const moment = require("moment");
const ArweaveModule = require("../../Arweave/modules/arweave.module");
const IPFSModule = require("../../IPFS/modules/ipfs.module");
const ZNSPartsModule = require("./zns-parts.module");
const WalrusModule = require("../../Walrus/modules/walrus.module");

/**
 * Main search function for ZelfNames
 * @param {Object} params - Search parameters
 * @param {Object} authUser - Authenticated user object
 * @returns {Object} Search results from different sources
 */
const searchZelfName = async (params, authUser) => {
	const query = params.zelfName ? { key: "zelfName", value: params.zelfName } : { key: params.key, value: params.value };

	query.value = query.key === "zelfName" ? query.value.toLowerCase() : query.value;

	if (params.duration) query.duration = params.duration;

	// Search in primary source (Arweave)

	const searchResult = {
		arweave: await _searchInArweave(query),
		ipfs: (await _searchInIPFS(params.environment, query, authUser))?.ipfs,
	};

	return {
		walrus: await WalrusModule.zelfNameRegistration(searchResult.ipfs[0].zelfProofQRCode, searchResult.ipfs[0].publicData),
	};
};

/**
 * Search in Arweave
 * @param {Object} query - Query object
 * @returns {Array} formatted Arweave records
 */
const _searchInArweave = async (query) => {
	try {
		const searchResults = await ArweaveModule.search(query);

		return await _returnFormattedArweaveRecords(searchResults);
	} catch (exception) {
		console.error({ exception: exception });
		return [];
	}
};

/**
 * Search in Storacha (placeholder for future implementation)
 * @param {Object} params - Search parameters
 * @param {Object} query - Query object
 * @returns {Array} formatted Storacha records
 */
const _searchInStoracha = async (params, query) => {
	// TODO: Implement Storacha search logic
	try {
		// const searchResults = await StorachaModule.search(params.zelfName || params.key === "zelfName" ? params.value : null, query);
		// return await _returnFormattedStorachaRecords(searchResults);
		return [];
	} catch (exception) {
		console.error({ StorachaSearchException: exception });
		return [];
	}
};

/**
 * Search in Walrus (placeholder for future implementation)
 * @param {Object} params - Search parameters
 * @param {Object} query - Query object
 * @returns {Array} formatted Walrus records
 */
const _searchInWalrus = async (params, query) => {
	// TODO: Implement Walrus search logic
	try {
		// const searchResults = await WalrusModule.search(params.zelfName || params.key === "zelfName" ? params.value : null, query);
		// return await _returnFormattedWalrusRecords(searchResults);
		return [];
	} catch (exception) {
		console.error({ WalrusSearchException: exception });
		return [];
	}
};

/**
 * Retrieve records from IPFS based on environment
 * @param {Array} ipfsRecords - Array to store IPFS records
 * @param {String} environment - Environment type (hold, mainnet, both)
 * @param {Object} query - Query object
 * @param {Object} authUser - Authenticated user object
 */
const _retriveFromIPFSByEnvironment = async (ipfsRecords, environment, query, authUser) => {
	switch (environment) {
		case "hold":
			ipfsRecords.push(
				...(await IPFSModule.get(
					{
						key: query.key || "zelfName",
						value: `${query.value || query.zelfName}.hold`,
					},
					authUser
				))
			);
			break;
		case "mainnet":
			ipfsRecords.push(...(await IPFSModule.get(query, authUser)));
			break;

		default:
			try {
				ipfsRecords.push(...(await IPFSModule.get(query, authUser)));
			} catch (exception) {
				console.error({ mainNetIPFSError: exception });
			}

			try {
				ipfsRecords.push(
					...(await IPFSModule.get(
						{
							key: query.key || "zelfName",
							value: `${query.value || query.zelfName}.hold`,
						},
						authUser
					))
				);
			} catch (exception) {
				console.error({ holdIPFSError: exception });
			}

			break;
	}
};

/**
 * Search in IPFS
 * @param {String} environment - Environment type (hold, mainnet, both)
 * @param {Object} query - Query object
 * @param {Object} authUser - Authenticated user object
 * @param {Boolean} foundInArweave - Whether results were found in Arweave
 * @returns {Array|Object} IPFS search results
 * @author Miguel Trevino
 */
const _searchInIPFS = async (environment = "both", query, authUser, foundInArweave) => {
	const zelfName = query.value || query.zelfName;

	const { price, reward } = zelfName.includes(".zelf")
		? ZNSPartsModule.calculateZelfNamePrice(zelfName.split(".zelf")[0].length, query.duration)
		: { price: 0, reward: 0 };

	try {
		let ipfsRecords = [];

		await _retriveFromIPFSByEnvironment(ipfsRecords, environment, query, authUser);

		if (!ipfsRecords.length) {
			return foundInArweave
				? []
				: zelfName && zelfName.includes(".zelf")
				? {
						price,
						reward,
						zelfName,
						available: true,
				  }
				: null;
		}

		const zelfNames = await _returnFormattedIPFSRecords(ipfsRecords, environment, foundInArweave);

		if (!zelfNames.length) {
			const error = new Error("not_found_in_arweave");
			error.status = 404;
			throw error;
		}

		return foundInArweave ? zelfNames : { ipfs: zelfNames };
	} catch (exception) {
		console.error({ _searchInIPFS_exception: exception });

		return foundInArweave
			? []
			: query.key === "zelfName"
			? {
					price,
					reward,
					zelfName,
					available: true,
			  }
			: null;
	}
};

/**
 * Format Arweave search results
 * @param {Array} searchResults - Raw Arweave search results
 * @returns {Array} Formatted Arweave records
 */
const _returnFormattedArweaveRecords = async (searchResults) => {
	if (searchResults?.available) return [];

	const zelfNames = [];

	const now = moment();

	const hideRecordsWithoutRegisteredAt = Boolean(searchResults.length >= 2);

	for (let index = 0; index < searchResults.length; index++) {
		const zelfNameObject = await ZNSPartsModule.formatArweaveRecord(searchResults[index]);

		if (hideRecordsWithoutRegisteredAt && !zelfNameObject.publicData.registeredAt) continue;

		const expiresAt = moment(zelfNameObject.publicData.expiresAt).add(45, "day");

		const isExpired = now.isAfter(expiresAt);

		if (isExpired) continue;

		zelfNameObject.zelfProof = zelfNameObject.zelfProof.replace(/ /g, "+");

		zelfNames.push(zelfNameObject);
	}

	return zelfNames;
};

/**
 * Format IPFS search results
 * @param {Array} ipfsRecords - Raw IPFS records
 * @param {String} environment - Environment type
 * @param {Boolean} foundInArweave - Whether results were found in Arweave
 * @returns {Array} Formatted IPFS records
 */
const _returnFormattedIPFSRecords = async (ipfsRecords, environment, foundInArweave) => {
	const zelfNamesInIPFS = [];

	const now = moment();

	for (let index = 0; index < ipfsRecords.length; index++) {
		const ipfsRecord = ipfsRecords[index];

		const formattedIPFS = await ZNSPartsModule.formatIPFSRecord(ipfsRecord, foundInArweave);

		const expiresAt = moment(formattedIPFS.publicData.expiresAt).add(formattedIPFS.publicData.type === "mainnet" ? 45 : 0, "day");

		const isExpired = now.isAfter(expiresAt);

		if (isExpired) {
			ipfsRecord.ipfs_pin_hash ? await IPFSModule.unPinFiles([ipfsRecord.ipfs_pin_hash]) : "do nothing";

			continue;
		}

		if (environment === "both") {
			zelfNamesInIPFS.push(formattedIPFS);

			continue;
		}

		if (
			(environment === "hold" && ipfsRecord.metadata.keyvalues.type === "hold") ||
			(environment === "mainnet" && (!ipfsRecord.metadata.keyvalues.type || ipfsRecord.metadata.keyvalues.type === "mainnet"))
		) {
			zelfNamesInIPFS.push(formattedIPFS);
		}
	}

	return zelfNamesInIPFS;
};

module.exports = {
	searchZelfName,
	_searchInArweave,
	_searchInStoracha,
	_searchInWalrus,
	_searchInIPFS,
	_retriveFromIPFSByEnvironment,
	_returnFormattedArweaveRecords,
	_returnFormattedIPFSRecords,
};
