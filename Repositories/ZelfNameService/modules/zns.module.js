const ArweaveModule = require("../../Arweave/modules/arweave.module");
const axios = require("axios");
const arweaveUrl = `https://arweave.net`;
const explorerUrl = `https://viewblock.io/arweave/tx`;
const { generateMnemonic } = require("../../Wallet/modules/helpers");
const { createEthWallet } = require("../../Wallet/modules/eth");
const { createSolanaWallet } = require("../../Wallet/modules/solana");
const { createBTCWallet } = require("../../Wallet/modules/btc");
const sessionModule = require("../../Session/modules/session.module");
const { encrypt, decrypt, preview, encryptQR } = require("../../Wallet/modules/encryption");
const OfflineProofModule = require("../../Mina/offline-proof");
const IPFSModule = require("../../IPFS/modules/ipfs.module");
const moment = require("moment");
const { createCoinbaseCharge, getCoinbaseCharge } = require("../../coinbase/modules/coinbase_commerce.module");
const config = require("../../../Core/config");

const evmCompatibleTickers = [
	"ETH", // Ethereum
	"BNB", // Binance Smart Chain
	"MATIC", // Polygon
	"AVAX", // Avalanche
	"FTM", // Fantom
	"ARB", // Arbitrum
	"OP", // Optimism
	"CRO", // Cronos
	"ONE", // Harmony
	"KLAY", // Klaytn
	"xDAI", // Gnosis Chain
	"GLMR", // Moonbeam
	"CELO", // Celo
	"OKT", // OKX Chain
	"AURORA", // Aurora (NEAR EVM)
].join(","); // Create a single string of tickers;

const zelfNamePricing = {
	1: { 1: 240, 2: 432, 3: 612, 4: 768, 5: 900, lifetime: 3600 },
	2: { 1: 120, 2: 216, 3: 306, 4: 384, 5: 450, lifetime: 1800 },
	3: { 1: 72, 2: 130, 3: 184, 4: 230, 5: 270, lifetime: 1080 },
	4: { 1: 36, 2: 65, 3: 92, 4: 115, 5: 135, lifetime: 540 },
	"5-15": { 1: 24, 2: 43, 3: 61, 4: 77, 5: 90, lifetime: 360 },
	16: { 1: 23, 2: 41, 3: 59, 4: 74, 5: 86, lifetime: 345 },
	17: { 1: 22, 2: 40, 3: 56, 4: 70, 5: 82, lifetime: 330 },
	18: { 1: 21, 2: 38, 3: 54, 4: 67, 5: 79, lifetime: 315 },
	19: { 1: 20, 2: 36, 3: 51, 4: 64, 5: 75, lifetime: 300 },
	20: { 1: 19, 2: 34, 3: 48, 4: 61, 5: 72, lifetime: 285 },
	21: { 1: 18, 2: 32, 3: 46, 4: 58, 5: 68, lifetime: 270 },
	22: { 1: 17, 2: 31, 3: 43, 4: 54, 5: 64, lifetime: 255 },
	23: { 1: 16, 2: 29, 3: 41, 4: 51, 5: 60, lifetime: 240 },
	24: { 1: 15, 2: 27, 3: 38, 4: 48, 5: 56, lifetime: 225 },
	25: { 1: 14, 2: 25, 3: 36, 4: 45, 5: 53, lifetime: 210 },
	26: { 1: 13, 2: 23, 3: 33, 4: 42, 5: 49, lifetime: 195 },
	27: { 1: 12, 2: 22, 3: 31, 4: 38, 5: 45, lifetime: 180 },
};

/**
 * Get Zelf Name price based on name length and duration
 * @param {number} length - The length of the Zelf name
 * @param {string} duration - Duration ("1", "2", "3", "4", "5", "lifetime")
 * @returns {number} - Price of the Zelf name
 */
const _calculateZelfNamePrice = (length, duration = 1) => {
	if (![1, 2, 3, 4, 5, "lifetime"].includes(duration)) throw new Error("Invalid duration. Use '1', '2', '3', '4', '5' or 'lifetime'.");

	let price = 24;

	if (length >= 5 && length <= 15) {
		price = zelfNamePricing["5-15"][duration];
	} else if (zelfNamePricing[length]) {
		price = zelfNamePricing[length][duration];
	} else {
		throw new Error("Invalid name length. Length must be between 1 and 27.");
	}

	return config.env === "development" ? price / 24 : price;
};

/**
 *
 * @param {*} params
 * @param {*} authUser
 */
const searchZelfName = async (params, authUser) => {
	const query = params.zelfName ? { key: "zelfName", value: params.zelfName } : { key: params.key, value: params.value };

	try {
		const searchResults = await ArweaveModule.search(params.environment, params.zelfName, query);

		if (searchResults?.available) {
			const error = new Error("not_found_in_arweave");

			error.status = 404;

			throw error;
		}

		const zelfNames = [];

		for (let index = 0; index < searchResults.length; index++) {
			const zelfNameObject = await _formatArweaveSearchResult(searchResults[index]);

			zelfNames.push(zelfNameObject);
		}

		return { arweave: zelfNames, ipfs: await _searchInIPFS(params.environment, query, authUser, true) };
	} catch (exception) {
		console.error({ exception: exception });

		return await _searchInIPFS(params.environment, query, authUser);
	}
};

const _removeExpiredRecords = async (records) => {
	const now = moment();

	// testing adding few days, so it's expired
	now.add(3, "day");

	for (let index = records.length - 1; index >= 0; index--) {
		const record = records[index];

		const expiresAt = moment(record.metadata.keyvalues.expiresAt);

		const isExpired = now.isAfter(expiresAt);

		if (isExpired) {
			records.splice(index, 1);
			continue;
		}
	}
};

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

	_removeExpiredRecords(ipfsRecords);
};

/**
 * search in IPFS
 * @param {Object} params
 * @param {Object} authUser
 * @author Miguel Trevino
 */
const _searchInIPFS = async (environment = "hold", query, authUser, foundInArweave) => {
	try {
		let ipfsRecords = [];

		await _retriveFromIPFSByEnvironment(ipfsRecords, environment, query, authUser);

		const value = query.value || query.zelfName;

		if (!ipfsRecords.length) {
			return foundInArweave
				? []
				: value
				? {
						price: _calculateZelfNamePrice(value.split(".zelf")[0].length, 1),
						zelfName: value,
						available: true,
				  }
				: null;
		}

		const zelfNamesInIPFS = [];

		for (let index = 0; index < ipfsRecords.length; index++) {
			const ipfsRecord = ipfsRecords[index];

			if (environment === "both") {
				zelfNamesInIPFS.push(await _formatIPFSSearchResult(ipfsRecord, foundInArweave));

				continue;
			}

			if (
				(environment === "hold" && ipfsRecord.metadata.keyvalues.type === "hold") ||
				(environment === "mainnet" && (!ipfsRecord.metadata.keyvalues.type || ipfsRecord.metadata.keyvalues.type === "mainnet"))
			) {
				zelfNamesInIPFS.push(await _formatIPFSSearchResult(ipfsRecord, foundInArweave));
			}
		}

		return foundInArweave ? zelfNamesInIPFS : { ipfs: zelfNamesInIPFS };
	} catch (exception) {
		console.error({ _searchInIPFS_exception: exception });

		return foundInArweave
			? []
			: query.key === "zelfName"
			? {
					price: _calculateZelfNamePrice(query.value.split(".zelf")[0].length, 1),
					zelfName: query.value,
					available: true,
			  }
			: null;
	}
};

const _formatArweaveSearchResult = async (transactionRecord) => {
	const zelfNameObject = {
		id: transactionRecord.node?.id,
		url: `${arweaveUrl}/${transactionRecord.node?.id}`,
		explorerUrl: `${explorerUrl}/${transactionRecord.node?.id}`,
		publicData: {},
	};

	for (let index = 0; index < transactionRecord.node?.tags.length; index++) {
		const tag = transactionRecord.node?.tags[index];

		zelfNameObject.publicData[tag.name] = tag.value;
	}

	const zelfProofTag = transactionRecord.node?.tags.find((tag) => tag.name === "zelfProof");

	const zelfNameTag = transactionRecord.node?.tags.find((tag) => tag.name === "zelfName");

	zelfNameObject.zelfProof = zelfProofTag ? zelfProofTag.value : null;

	zelfNameObject.zelfName = zelfNameTag.value;

	zelfNameObject.zelfProofQRCode = await _arweaveIDToBase64(zelfNameObject.id);

	return zelfNameObject;
};

const _formatIPFSSearchResult = async (ipfsRecord, foundInArweave) => {
	const zelfNameObject = {
		...ipfsRecord,
		publicData: {
			name: ipfsRecord.metadata.name,
			...ipfsRecord.metadata.keyvalues,
		},
		zelfName: ipfsRecord.metadata.name,
	};

	if (!foundInArweave) {
		zelfNameObject.zelfProof = zelfNameObject.publicData.zelfProof;

		zelfNameObject.zelfProofQRCode = await _IPFSToBase64(zelfNameObject.url);
	}

	delete zelfNameObject.metadata;

	return zelfNameObject;
};

const _IPFSToBase64 = async (url) => {
	try {
		const encryptedResponse = await axios.get(url, { responseType: "arraybuffer" });

		if (encryptedResponse?.data) {
			const base64Image = Buffer.from(encryptedResponse.data).toString("base64");

			return `data:image/png;base64,${base64Image}`;
		}
	} catch (exception) {
		console.error({ VWEx: exception });

		return exception?.message;
	}
};

const _arweaveIDToBase64 = async (id) => {
	try {
		const encryptedResponse = await axios.get(`https://arweave.net/${id}`, { responseType: "arraybuffer" });

		if (encryptedResponse?.data) {
			const base64Image = Buffer.from(encryptedResponse.data).toString("base64");

			return `data:image/png;base64,${base64Image}`;
		}
	} catch (exception) {
		console.error({ VWEx: exception });

		return exception?.message;
	}
};

/**
 * lease zelfName
 * @param {Object} params
 * @param {Object} authUser
 */
const leaseZelfName = async (params, authUser) => {
	const { zelfName, duration } = params;

	await _findDuplicatedZelfName(zelfName, "both", authUser);

	const { face, password, mnemonic } = await _decryptParams(params, authUser);

	const _mnemonic = params.type === "import" ? mnemonic : generateMnemonic(params.wordsCount);

	const wordsArray = _mnemonic.split(" ");

	if (wordsArray.length !== 12 && wordsArray.length !== 24) throw new Error("409:mnemonic_invalid");

	const eth = createEthWallet(_mnemonic);
	const btc = createBTCWallet(_mnemonic);
	const solana = await createSolanaWallet(_mnemonic);
	const zkProof = await OfflineProofModule.createProof(_mnemonic);
	const zelfNameObject = {};

	const dataToEncrypt = {
		publicData: {
			ethAddress: eth.address,
			solanaAddress: solana.address,
			btcAddress: btc.address,
			zelfName,
		},
		metadata: {
			mnemonic: _mnemonic,
			zkProof,
		},
		faceBase64: face,
		password,
		_id: zelfName,
		tolerance: params.tolerance,
		addServerPassword: Boolean(params.addServerPassword),
	};

	zelfNameObject.zelfProof = await encrypt(dataToEncrypt);

	if (!zelfNameObject.zelfProof) throw new Error("409:Wallet_could_not_be_encrypted");

	zelfNameObject.zelfName = zelfName;
	zelfNameObject.price = _calculateZelfNamePrice(zelfName.length - 5, duration);
	zelfNameObject.publicData = dataToEncrypt.publicData;
	zelfNameObject.ethAddress = eth.address;
	zelfNameObject.btcAddress = btc.address;
	zelfNameObject.solanaAddress = solana.address;
	zelfNameObject.hasPassword = `${Boolean(password)}`;
	zelfNameObject.metadata = params.previewZelfProof ? dataToEncrypt.metadata : undefined;

	zelfNameObject.coinbaseCharge = await createCoinbaseCharge({
		name: `${zelfNameObject.zelfName}`,
		description: `Purchase of the Zelf Name > ${zelfNameObject.zelfName} for $${zelfNameObject.price}`,
		pricing_type: "fixed_price",
		local_price: {
			amount: `${zelfNameObject.price}`,
			currency: "USD",
		},
		metadata: {
			// Custom metadata (optional)
			zelfName: zelfNameObject.zelfName,
			ethAddress: eth.address,
			btcAddress: btc.address,
			solanaAddress: solana.address,
		},
		redirect_url: "https://name.zelf.world/#/coinbase-success",
		cancel_url: "https://name.zelf.world/#/coinbase-cancel",
	});

	if (!params.skipZNS) {
		zelfNameObject.image = await encryptQR(dataToEncrypt);

		// zelfNameObject.holdTransaction = await ArweaveModule.zelfNameHold(zelfNameObject.image, zelfNameObject);

		const holdName = `${zelfName}.hold`;

		zelfNameObject.ipfs = await IPFSModule.insert(
			{
				base64: zelfNameObject.image,
				name: holdName,
				metadata: {
					// ...zelfNameObject.publicData,
					zelfProof: zelfNameObject.zelfProof,
					zelfName: holdName,
					duration: duration || 1,
					price: zelfNameObject.price,
					expiresAt: moment().add(12, "hour").format("YYYY-MM-DD HH:mm:ss"),
					type: "hold",
					coinbase_hosted_url: zelfNameObject.coinbaseCharge.hosted_url,
					coinbase_expires_at: zelfNameObject.coinbaseCharge.expires_at,
				},
				pinIt: true,
			},
			{ ...authUser, pro: true }
		);
	}

	return { ...zelfNameObject, hasPassword: Boolean(password) };
};

/**
 * lease confirmation
 * @param {Object} data
 * @param {Object} authUser
 * @author Miguel Trevino
 */
const leaseConfirmation = async (data, authUser) => {
	const { network, coin, zelfName } = data;
	let unpinResult;
	let inMainnet = false;

	const zelfNameRecords = await previewZelfName({ zelfName, environment: "both" }, authUser);

	for (let index = 0; index < zelfNameRecords.length; index++) {
		const record = zelfNameRecords[index];

		inMainnet = Boolean(record.publicData?.type === "mainnet");
	}

	if (!zelfNameRecords.length) {
		const error = new Error("zelfName_not_found");
		error.status = 404;
		throw error;
	}

	if (zelfNameRecords.length === 2 || inMainnet) {
		const error = new Error("zelfName_purchased_already");
		error.status = 409;
		throw error;
	}

	const zelfNameObject = zelfNameRecords[0];

	let payment = false;

	switch (network) {
		case "coinbase":
			payment = await _confirmCoinbaseCharge(zelfNameObject);

			break;

		default:
			break;
	}

	// mover el registro a la wallet de nosotros ( no la temporal ) > ipfs clonar sin la propiedad de type = 'hold'
	if (payment?.confirmed) {
		unpinResult = await IPFSModule.unPinFiles([zelfNameObject.ipfs_pin_hash]);

		const { masterIPFSRecord, masterArweaveRecord } = await _cloneZelfNameToProduction(zelfNameObject, payment);

		return {
			ipfs: [masterIPFSRecord],
			arweave: [masterArweaveRecord],
		};
	}

	return {
		zelfNameObject,
		zelfName,
		payment,
		hold: unpinResult,
	};
};

const _confirmCoinbaseCharge = async (zelfNameObject) => {
	const chargeID = zelfNameObject.publicData?.coinbase_id || zelfNameObject.publicData?.coinbase_hosted_url.split("/pay/")[1];

	if (!chargeID) {
		const error = new Error("coinbase_charge_id_not_found");

		error.status = 404;

		throw error;
	}

	const charge = await getCoinbaseCharge(chargeID);

	if (!charge) return false;

	const timeline = charge.timeline;

	let confirmed = false;

	for (let index = 0; index < timeline.length; index++) {
		const _timeline = timeline[index];

		if (_timeline.status === "COMPLETED") {
			confirmed = true;
		}
	}

	return {
		...charge,
		confirmed: true,
	};
};

/**
 * clone zelf name to production
 * @param {Object} zelfNameObject
 * @param {Object} payment
 * @author Miguel Trevino
 */
const _cloneZelfNameToProduction = async (zelfNameObject, payment) => {
	// first clone it to ipfs, then to arweave
	const payload = {
		base64: zelfNameObject.zelfProofQRCode,
		name: zelfNameObject.preview?.publicData.zelfName || zelfNameObject.publicData.zelfName.replace(".hold", ""),
		metadata: {
			hasPassword: `${Boolean(zelfNameObject.preview?.passwordLayer === "Password")}`,
			zelfProof: zelfNameObject.publicData.zelfProof,
			...zelfNameObject.preview?.publicData,
			expiresAt: moment()
				.add(zelfNameObject.publicData.duration || 1, "year")
				.format("YYYY-MM-DD HH:mm:ss"),
			type: "mainnet",
		},
		pinIt: true,
	};

	const masterIPFSRecord = await IPFSModule.insert(payload, { pro: true });

	const masterArweaveRecord = await ArweaveModule.zelfNameRegistration(zelfNameObject.zelfProofQRCode, {
		hasPassword: payload.metadata.hasPassword,
		zelfProof: payload.metadata.zelfProof,
		publicData: {
			...zelfNameObject.preview?.publicData,
			type: "mainnet",
			expiresAt: moment()
				.add(zelfNameObject.publicData.duration || 1, "year")
				.format("YYYY-MM-DD HH:mm:ss"),
		},
	});

	return {
		masterArweaveRecord,
		masterIPFSRecord,
	};
};

const _decryptParams = async (data, authUser) => {
	if (data.removePGP) {
		return {
			password: data.password,
			mnemonic: data.mnemonic,
			face: data.faceBase64,
		};
	}

	const password = await sessionModule.sessionDecrypt(data.password || null, authUser);

	const mnemonic = await sessionModule.sessionDecrypt(data.mnemonic || null, authUser);

	const face = await sessionModule.sessionDecrypt(data.faceBase64 || null, authUser);

	return { password, mnemonic, face };
};

const _findDuplicatedZelfName = async (zelfName, environment = "both", authUser, returnResults = false) => {
	const searchResult = await searchZelfName(
		{
			zelfName,
			environment,
		},
		authUser
	);

	if (searchResult.available) return null;

	if (returnResults) return searchResult;

	const error = new Error("zelfName_is_taken");

	error.status = 409;

	throw error;
};

/**
 * preview Zelf name
 * @param {String} zelfName
 * @param {Object} authUser
 */
const previewZelfName = async (params, authUser) => {
	try {
		let zelfNameObjects = await _findZelfName(params.zelfName, params.environment, authUser);

		if (!Array.isArray(zelfNameObjects)) {
			zelfNameObjects = [zelfNameObjects];
		}

		for (let index = 0; index < zelfNameObjects.length; index++) {
			const zelfNameObject = zelfNameObjects[index];

			if (zelfNameObject.ipfs_pin_hash && zelfNameObject.publicData.arweaveId) {
				zelfNameObject.url = `${arweaveUrl}/${zelfNameObject.publicData.arweaveId}`;

				zelfNameObject.explorerUrl = `${explorerUrl}/${zelfNameObject.publicData.arweaveId}`;
			}

			zelfNameObject.source = zelfNameObject.ipfs_pin_hash ? "ipfs" : "arweave";

			zelfNameObject.preview = await preview({ zelfProof: zelfNameObject.zelfProof });
		}

		return zelfNameObjects;
	} catch (exception) {
		return await _previewWithIPFS(params, authUser);
	}
};

/**
 * preview with IPFS
 * @param {Object} params
 * @param {Object} authUser
 * @author Miguel Trevino
 */
const _previewWithIPFS = async (params, authUser) => {
	try {
		const searchResult = await _searchInIPFS(params.environment, params, { ...authUser, pro: true }, false);

		if (!searchResult || searchResult?.available) throw new Error("404:not_found");

		searchResult[0].preview = await preview({ zelfProof: searchResult[0].zelfProof });

		return searchResult;
	} catch (exception) {
		console.error({ exception });

		const error = new Error("zelfName_not_found");

		error.status = 404;

		throw error;
	}
};

const _findZelfName = async (zelfName, environment = "hold", authUser) => {
	const searchResults = await searchZelfName(
		{
			zelfName,
			environment,
		},
		authUser
	);

	if (!searchResults.arweave?.length && !searchResults.ipfs?.length) {
		const error = new Error(`zelfName_not_found`);

		error.status = 404;

		throw error;
	}

	const inArweave = Boolean(searchResults.arweave?.length);

	if (environment === "both") {
		return inArweave ? searchResults.arweave : searchResults.ipfs;
	}

	return inArweave ? searchResults.arweave[0] : searchResults.ipfs[0];
};

/**
 * decrypt zelfName
 * @param {Object} params
 * @param {Object} authUser
 */
const decryptZelfName = async (params, authUser) => {
	const zelfNameObject = await _findZelfName(params.zelfName, params.environment, authUser);

	const { face, password } = await _decryptParams(params, authUser);

	const decryptedZelfProof = await decrypt({
		zelfProof: zelfNameObject.zelfProof || params.zelfProof,
		faceBase64: face,
		password,
		addServerPassword: Boolean(params.addServerPassword),
	});

	if (decryptedZelfProof.error) {
		const error = new Error(decryptedZelfProof.error.code);
		error.status = 409;
		throw error;
	}

	return {
		zelfName: zelfNameObject.publicData.zelfName,
		image: zelfNameObject.zelfProofQRCode,
		metadata: decryptedZelfProof.metadata,
		publicData: decryptedZelfProof.publicData,
	};
};

const leaseOffline = async (params, authUser) => {
	const { zelfName, duration, zelfProof, zelfProofQRCode } = params;

	let mainnetRecord = null;
	let holdRecord = null;
	let zelfNameRecords = [];

	try {
		zelfNameRecords = await previewZelfName({ zelfName, environment: "both" }, authUser);
	} catch (exception) {}

	if (zelfNameRecords.length === 2) {
		const error = new Error("zelfName_purchased_already");
		error.status = 409;
		throw error;
	}

	for (let index = 0; index < zelfNameRecords.length; index++) {
		const ipfsRecord = zelfNameRecords[index];

		if (ipfsRecord.publicData.type === "hold") holdRecord = ipfsRecord;

		if (ipfsRecord.publicData.type === "mainnet") mainnetRecord = ipfsRecord;
	}

	let _preview = holdRecord?.preview || mainnetRecord?.preview;

	const zelfNameObject = {
		zelfName: `${zelfName}.hold`,
		zelfProof,
		image: zelfProofQRCode,
		price: _calculateZelfNamePrice(zelfName.length - 5, duration),
	};

	if (!_preview) {
		_preview = await preview({ zelfProof: zelfNameObject.zelfProof });
	}

	const coinbasePayload = {
		name: `${zelfNameObject.zelfName}`,
		description: `Purchase of the Zelf Name > ${zelfNameObject.zelfName} for $${zelfNameObject.price}`,
		pricing_type: "fixed_price",
		local_price: {
			amount: `${zelfNameObject.price}`,
			currency: "USD",
		},
		metadata: {
			zelfName: zelfNameObject.zelfName,
			ethAddress: _preview.publicData.ethAddress,
			btcAddress: _preview.publicData.btcAddress,
			solanaAddress: _preview.publicData.solanaAddress,
		},
		redirect_url: "https://name.zelf.world/#/coinbase-success",
		cancel_url: "https://name.zelf.world/#/coinbase-cancel",
	};

	return {
		preview: _preview,
		coinbasePayload,
	};

	// unpin previous holdRecord
	// if (holdRecord) {
	// 	unpinResult = await IPFSModule.unPinFiles([holdRecord.ipfs_pin_hash]);
	// }

	// 3. create the .hold if it was not found
	zelfNameObject.coinbaseCharge = await createCoinbaseCharge({
		name: `${zelfNameObject.zelfName}`,
		description: `Purchase of the Zelf Name > ${zelfNameObject.zelfName} for $${zelfNameObject.price}`,
		pricing_type: "fixed_price",
		local_price: {
			amount: `${zelfNameObject.price}`,
			currency: "USD",
		},
		metadata: {
			// Custom metadata (optional)
			zelfName: zelfNameObject.zelfName,
			ethAddress: eth.address,
			btcAddress: btc.address,
			solanaAddress: solana.address,
		},
		redirect_url: "https://name.zelf.world/#/coinbase-success",
		cancel_url: "https://name.zelf.world/#/coinbase-cancel",
	});

	zelfNameObject.ipfs = await IPFSModule.insert(
		{
			base64: zelfNameObject.image,
			name: zelfNameObject.zelfName,
			metadata: {
				zelfProof: zelfNameObject.zelfProof,
				zelfName: zelfNameObject.zelfName,
				duration: duration || 1,
				price: zelfNameObject.price,
				expiresAt: moment().add(12, "hour").format("YYYY-MM-DD HH:mm:ss"),
				type: "hold",
				coinbase_hosted_url: zelfNameObject.coinbaseCharge.hosted_url,
				coinbase_expires_at: zelfNameObject.coinbaseCharge.expires_at,
			},
			pinIt: true,
		},
		{ ...authUser, pro: true }
	);
	// 3.2 delete the expired records from ipfs

	return {
		// searchResult,
		holdRecord,
		mainnetRecord,
	};
};

module.exports = {
	searchZelfName,
	leaseZelfName,
	leaseConfirmation,
	previewZelfName,
	decryptZelfName,
	//Offline
	leaseOffline,
};
