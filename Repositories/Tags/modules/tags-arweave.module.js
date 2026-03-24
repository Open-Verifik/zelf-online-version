const { TurboFactory, USD, WinstonToTokenAmount, productionTurboConfiguration } = require("@ardrive/turbo-sdk");
const Arweave = require("arweave");
const { Readable } = require("stream");
const config = require("../../../Core/config");
const axios = require("axios");
const { getDomainConfiguration } = require("./domain-registry.module");

const arweaveUrl = `https://arweave.zelf.world`;
const fallbackArweaveUrl = `https://arweave.net`;
const explorerUrl = `https://viewblock.io/arweave/tx`;

const owner = config.arwave.env === "development" ? config.arwave.hold.owner : config.arwave.owner;

/** Max wait for Arweave GraphQL / gateway HTTP (axios), in ms */
const ARWEAVE_HTTP_TIMEOUT_MS = 10_000;

/** After primary GraphQL fails, prefer public arweave.net/graphql first for this long (ms) */
const STICKY_FALLBACK_MS = 5 * 60 * 1000;

let stickyPublicGraphqlUntil = 0;

/**
 * POST a single GraphQL query to an Arweave gateway.
 * @param {string} graphqlUrl - Full URL e.g. https://arweave.zelf.world/graphql
 * @param {string} queryString
 * @returns {Promise<Array|undefined>} transactions.edges
 */
const postArweaveGraphql = async (graphqlUrl, queryString) => {
	const result = await axios.post(
		graphqlUrl,
		{ query: queryString },
		{
			headers: { "Content-Type": "application/json" },
			timeout: ARWEAVE_HTTP_TIMEOUT_MS,
		}
	);

	if (result.data?.errors?.length) {
		const msg = result.data.errors.map((e) => e.message).join("; ");
		const err = new Error(msg);
		err.graphqlErrors = result.data.errors;
		throw err;
	}

	return result.data?.data?.transactions?.edges;
};

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

	const primaryGql = `${arweaveUrl}/graphql`;
	const publicGql = `${fallbackArweaveUrl}/graphql`;

	const advancedQuery = `
		{
			 transactions(
				tags: ${tagsToSearch},
				owners: ["${owner}"],
				sort: HEIGHT_DESC,
				first: 100
			) {
				edges {
					node {
						id
						owner {
							address
						}
						block {
							height
							id
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
	  `;

	const legacyQuery = `
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
	  `;

	const advancedThenLegacyOnUrl = async (graphqlUrl) => {
		try {
			const edges = await postArweaveGraphql(graphqlUrl, advancedQuery);
			return edges || [];
		} catch (eAdv) {
			console.warn("Arweave GraphQL (sorted) failed, retrying legacy query:", graphqlUrl, eAdv?.message || eAdv);
			const edges = await postArweaveGraphql(graphqlUrl, legacyQuery);
			return edges || [];
		}
	};

	let searchResults;
	const stickyActive = Date.now() < stickyPublicGraphqlUntil;

	if (stickyActive) {
		let edgesFromPublic = null;
		let publicError = null;
		try {
			edgesFromPublic = await advancedThenLegacyOnUrl(publicGql);
		} catch (e) {
			publicError = e;
			console.warn("Arweave public GraphQL failed (sticky mode), trying primary:", e?.message || e);
		}

		if (edgesFromPublic?.length) {
			searchResults = edgesFromPublic;
		} else {
			try {
				searchResults = await advancedThenLegacyOnUrl(primaryGql);
				stickyPublicGraphqlUntil = 0;
			} catch (ePri) {
				if (publicError) {
					throw publicError;
				}
				searchResults = edgesFromPublic || [];
			}
		}
	} else {
		try {
			searchResults = await advancedThenLegacyOnUrl(primaryGql);
		} catch (ePri) {
			console.warn("Arweave primary GraphQL failed, trying public:", ePri?.message || ePri);
			try {
				searchResults = await advancedThenLegacyOnUrl(publicGql);
				stickyPublicGraphqlUntil = Date.now() + STICKY_FALLBACK_MS;
			} catch (ePub) {
				throw ePub;
			}
		}
	}

	if (!searchResults || !searchResults.length) return [];

	const formatted = formatSearchResults(searchResults);

	return sortArweaveSearchResultsNewestFirst(formatted);
};

/**
 * Parse lease expiry for ordering when multiple txs share the same tag key (renewals).
 * @param {string|undefined} s
 * @returns {number}
 */
const _expiresAtToMs = (s) => {
	if (!s || typeof s !== "string") return 0;
	const m = s.match(/^(\d{4}-\d{2}-\d{2})\s+(\d{2}:\d{2}:\d{2})$/);
	if (m) {
		const t = Date.parse(`${m[1]}T${m[2]}Z`);
		return Number.isFinite(t) ? t : 0;
	}
	const t = Date.parse(s);
	return Number.isFinite(t) ? t : 0;
};

/**
 * Prefer latest confirmed tx (block height), then latest expiresAt, then tx id.
 * @param {Array<Object>} formattedResults
 * @returns {Array<Object>}
 */
const sortArweaveSearchResultsNewestFirst = (formattedResults) => {
	if (!formattedResults?.length) return formattedResults;

	return [...formattedResults].sort((a, b) => {
		const ha = a.blockHeight != null ? Number(a.blockHeight) : -1;
		const hb = b.blockHeight != null ? Number(b.blockHeight) : -1;
		if (hb !== ha) return hb - ha;

		const ea = _expiresAtToMs(a.publicData?.expiresAt);
		const eb = _expiresAtToMs(b.publicData?.expiresAt);
		if (eb !== ea) return eb - ea;

		return String(b.id || "").localeCompare(String(a.id || ""));
	});
};

const formatSearchResults = (searchResults) => {
	const formattedResults = [];

	for (let index = 0; index < searchResults.length; index++) {
		const searchResult = searchResults[index];

		const blockHeight = searchResult.node.block?.height;

		const formattedResult = {
			id: searchResult.node.id,
			owner: searchResult.node.owner.address,
			url: `${arweaveUrl}/${searchResult.node.id}`,
			explorerUrl: `${explorerUrl}/${searchResult.node.id}`,
			publicData: {},
			size: searchResult.node.data.size,
			blockHeight: blockHeight != null ? Number(blockHeight) : null,
			blockId: searchResult.node.block?.id || null,
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
	const fetchTx = async (baseUrl) => {
		const encryptedResponse = await axios.get(`${baseUrl}/${id}`, {
			responseType: "arraybuffer",
			timeout: ARWEAVE_HTTP_TIMEOUT_MS,
			validateStatus: (s) => s >= 200 && s < 300,
		});
		if (encryptedResponse?.data && encryptedResponse.data.byteLength > 0) {
			const base64Image = Buffer.from(encryptedResponse.data).toString("base64");
			return `data:image/png;base64,${base64Image}`;
		}
		return null;
	};

	try {
		const primary = await fetchTx(arweaveUrl);
		if (primary) return primary;
	} catch (exception) {
		console.error({ VWEx_primary: exception });
	}

	try {
		const fallback = await fetchTx(fallbackArweaveUrl);
		if (fallback) return fallback;
	} catch (exception) {
		console.error({ VWEx_fallback: exception });
		return exception?.message;
	}

	return null;
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
