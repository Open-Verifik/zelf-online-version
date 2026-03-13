const { TurboFactory, USD, WinstonToTokenAmount, productionTurboConfiguration } = require("@ardrive/turbo-sdk");
const Arweave = require("arweave");
const { Readable } = require("stream");
const config = require("../../../Core/config");
const axios = require("axios");
const { getDomainConfiguration, generateStorageKey } = require("./domain-registry.module");

const arweaveUrl = `https://arweave.zelf.world`;
const explorerUrl = `https://viewblock.io/arweave/tx`;

const owner = config.arwave.env === "development" ? config.arwave.hold.owner : config.arwave.owner;

const graphql = `${arweaveUrl}/graphql`;

/**
 * Register tag on Arweave
 * @param {string} tagProofQRCode - Tag proof QR code
 * @param {Object} tagObject - Tag object data
 * @param {string} fileName - File name
 * @returns {Object} - Arweave registration result
 */
const tagRegistration = async (tagProofQRCode, tagObject, fileName) => {
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

	// Convert base64 string to a buffer; upload from memory (no temp file → no nodemon restart)
	const base64Data = tagProofQRCode.replace(/^data:image\/\w+;base64,/, "");
	const buffer = Buffer.from(base64Data, "base64");
	const fileSize = buffer.length;

	const tags = [
		{
			name: "Content-Type",
			value: "image/png",
		},
	];

	if (zelfProof) {
		tags.push({
			name: "zelfProof",
			value: zelfProof,
		});
	}

	if (hasPassword) {
		tags.push({
			name: "hasPassword",
			value: hasPassword,
		});
	}

	const publicKeys = Object.keys(publicData);

	for (let index = 0; index < publicKeys.length; index++) {
		const publicKey = publicKeys[index];

		if (publicKey === "zelfProof" || publicKey === "hasPassword") continue;

		tags.push({
			name: publicKey,
			value: `${publicData[publicKey]}`,
		});
	}

	if (fileSize > 100 * 1024) {
		console.info("skipping upload because the file size is greater than 100kb", {
			fileInKb: fileSize / 1024,
			fileInMb: fileSize / 1024 / 1024,
		});
		return { skipped: true };
	}

	const uploadResult = await turboAuthClient.uploadFile({
		fileStreamFactory: () => Readable.from(buffer),
		fileSizeFactory: () => fileSize,
		dataItemOpts: { tags },
	});

	return formatCreatedRecord({
		...uploadResult,
		publicData,
		url: `${arweaveUrl}/${uploadResult.id}`,
		explorerUrl: `${explorerUrl}/${uploadResult.id}`,
	});
};

/**
 * Register a receipt (e.g. referral reward JSON) on Arweave.
 * Accepts any data URL (application/json, image/png, etc.); tagRegistration is image-only.
 * @param {string} dataUrl - Data URL (e.g. data:application/json;base64,...)
 * @param {Object} tagObject - { publicData }
 * @param {string} fileName - File name (no extension)
 * @returns {Object} - Arweave registration result
 */
const receiptRegistration = async (dataUrl, tagObject, fileName) => {
	const { publicData } = tagObject;

	const env = config.arwave.env;

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

	const turboAuthClient = TurboFactory.authenticated({
		privateKey: jwk,
		...productionTurboConfiguration,
	});

	const dataUrlMatch = dataUrl.match(/^data:([^;]+);base64,(.+)$/);
	const contentType = dataUrlMatch ? dataUrlMatch[1] : "application/json";
	const base64Data = dataUrlMatch ? dataUrlMatch[2] : dataUrl.replace(/^data:[^;]+;base64,/, "");

	const buffer = Buffer.from(base64Data, "base64");
	const fileSize = buffer.length;

	const tags = [
		{
			name: "Content-Type",
			value: contentType,
		},
	];

	const publicKeys = Object.keys(publicData);
	for (let index = 0; index < publicKeys.length; index++) {
		const publicKey = publicKeys[index];
		tags.push({
			name: publicKey,
			value: `${publicData[publicKey]}`,
		});
	}

	if (fileSize > 100 * 1024) {
		console.info("skipping receipt upload because the file size is greater than 100kb", {
			fileInKb: fileSize / 1024,
			fileInMb: fileSize / 1024 / 1024,
		});
		return { skipped: true };
	}

	const uploadResult = await turboAuthClient.uploadFile({
		fileStreamFactory: () => Readable.from(buffer),
		fileSizeFactory: () => fileSize,
		dataItemOpts: { tags },
	});

	return formatCreatedRecord({
		...uploadResult,
		publicData,
		url: `${arweaveUrl}/${uploadResult.id}`,
		explorerUrl: `${explorerUrl}/${uploadResult.id}`,
	});
};

/**
 * Search for tags by storage key
 * @param {Object} params - Search parameters
 * @param {string} params.domainConfig - Domain configuration
 * @param {string} params.tagName - Tag name
 * @returns {Array} - Search results
 */
const searchByStorageKey = async (params) => {
	const { tagName, domainConfig, domain, key, value } = params;

	const _domainConfig = domainConfig || getDomainConfiguration(domain);

	return key ? await searchInArweave(key, value) : await searchInArweave(_domainConfig.getTagKey(), tagName);
};

const searchByDomain = async (params) => {
	const { domain } = params;

	return await searchInArweave("domain", domain);
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

	if (!searchResults || !searchResults.length) return [];

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

		if (formattedResult.publicData.leaseExpiresAt) {
			formattedResult.publicData.expiresAt = formattedResult.publicData.leaseExpiresAt;
		}

		formattedResults.push(formattedResult);
	}

	return formattedResults;
};

const arweaveIDToBase64 = async (id) => {
	try {
		const encryptedResponse = await axios.get(`${arweaveUrl}/${id}`, {
			responseType: "arraybuffer",
		});

		if (encryptedResponse?.data) {
			const base64Image = Buffer.from(encryptedResponse.data).toString("base64");

			return `data:image/png;base64,${base64Image}`;
		}
	} catch (exception) {
		console.error({ VWEx: exception });

		return exception?.message;
	}
};

const formatCreatedRecord = (record) => {
	const formattedRecord = {
		...record,
		publicData: record.publicData || {},
	};

	if (record.publicData.extraParams) {
		const extraParams = JSON.parse(record.publicData.extraParams);

		Object.assign(formattedRecord.publicData, extraParams);

		delete formattedRecord.publicData.extraParams;
	}

	if (formattedRecord.publicData.leaseExpiresAt) {
		formattedRecord.publicData.expiresAt = formattedRecord.publicData.leaseExpiresAt;
	}

	return formattedRecord;
};

module.exports = {
	tagRegistration,
	receiptRegistration,
	searchByStorageKey,
	searchByDomain,
	arweaveIDToBase64,
};
