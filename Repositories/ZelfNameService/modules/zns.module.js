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

const _calculateZelfNamePrice = (nameLength) => {
	const basePrice = 24;

	const priceMultipliers = {
		1: 3,
		2: 2,
		3: 1.5,
		4: 1.25,
	};

	if (nameLength >= 1 && nameLength <= 4) {
		return basePrice * priceMultipliers[nameLength];
	} else if (nameLength >= 5 && nameLength <= 15) {
		return basePrice;
	} else if (nameLength >= 15 && nameLength <= 20) {
		return basePrice * 0.75;
	} else {
		return basePrice * 0.5;
	}
};

/**
 *
 * @param {*} params
 * @param {*} authUser
 */
const searchZelfName = async (params, authUser) => {
	const query = params.zelfName ? { key: "zelfName", value: params.zelfName } : { key: params.key, value: params.value };

	try {
		const searchResults = await ArweaveModule.search(params.zelfName, query);

		if (searchResults?.available) throw new Error("404:not_found_in_arweave");

		const zelfNames = [];

		for (let index = 0; index < searchResults.length; index++) {
			const zelfNameObject = await _formatArweaveSearchResult(searchResults[index]);

			zelfNames.push(zelfNameObject);
		}

		return { arweave: zelfNames, ipfs: await _searchInIPFS(query, authUser, true) };
	} catch (exception) {
		console.error({ exception });

		return await _searchInIPFS(query, authUser);
	}
};

/**
 * search in IPFS
 * @param {Object} params
 * @param {Object} authUser
 * @author Miguel Trevino
 */
const _searchInIPFS = async (query, authUser, foundInArweave) => {
	try {
		const ipfsRecords = await IPFSModule.get(query, authUser);

		const zelfNamesInIPFS = [];

		for (let index = 0; index < ipfsRecords.length; index++) {
			const ipfsRecord = ipfsRecords[index];

			zelfNamesInIPFS.push(await _formatIPFSSearchResult(ipfsRecord, foundInArweave));
		}

		return foundInArweave ? zelfNamesInIPFS : { ipfs: zelfNamesInIPFS };
	} catch (exception) {
		return foundInArweave
			? []
			: query.key === "zelfName"
			? {
					price: _calculateZelfNamePrice(query.value.split(".zelf")[0].length),
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
	const { zelfName } = params;

	await _findDuplicatedZelfName(zelfName, authUser);

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
			evm: evmCompatibleTickers,
			solanaAddress: solana.address,
			btcAddress: btc.address,
			zelfName,
			leaseExpiresAt: moment().add(1, "year").format("YYYY-MM-DD HH:mm:ss"),
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
	zelfNameObject.publicData = dataToEncrypt.publicData;
	zelfNameObject.ethAddress = eth.address;
	zelfNameObject.btcAddress = btc.address;
	zelfNameObject.solanaAddress = solana.address;
	zelfNameObject.hasPassword = Boolean(password);
	zelfNameObject.metadata = params.previewZelfProof ? dataToEncrypt.metadata : undefined;

	if (!params.skipZNS) {
		zelfNameObject.image = await encryptQR(dataToEncrypt);

		zelfNameObject.leaseTransaction = await ArweaveModule.uploadZelfProof(zelfNameObject.image, zelfNameObject);

		zelfNameObject.ipfs = await IPFSModule.insert(
			{
				base64: zelfNameObject.image,
				name: zelfNameObject.zelfName,
				metadata: {
					...zelfNameObject.publicData,
					arweaveId: zelfNameObject.leaseTransaction.id,
					zelfProof: zelfNameObject.zelfProof,
					hasPassword: `${zelfNameObject.hasPassword}`,
				},
				pinIt: true,
			},
			{ ...authUser, pro: true }
		);
	}

	return zelfNameObject;
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

const _findDuplicatedZelfName = async (zelfName, authUser) => {
	const zelfNameObject = await searchZelfName({ zelfName }, authUser);

	if (zelfNameObject.available) return null;

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
		const zelfNameObject = await _findZelfName(params.zelfName, authUser);

		if (zelfNameObject.ipfs_pin_hash) {
			zelfNameObject.url = `${arweaveUrl}/${zelfNameObject.publicData.arweaveId}`;

			zelfNameObject.explorerUrl = `${explorerUrl}/${zelfNameObject.publicData.arweaveId}`;
		}

		zelfNameObject.source = zelfNameObject.ipfs_pin_hash ? "ipfs" : "arweave";

		return [zelfNameObject];
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
		const searchResult = await _searchInIPFS(params, { ...authUser, pro: true }, false);

		if (searchResult?.available) throw new Error("404");

		for (let index = 0; index < searchResult?.ipfs.length; index++) {
			const ipfsRecord = searchResult.ipfs[index];

			ipfsRecord.preview = await preview({ zelfProof: ipfsRecord.zelfProof });
		}

		return searchResult;
	} catch (exception) {
		const error = new Error("zelfName_not_found");

		error.status = 404;

		throw error;
	}
};

const _findZelfName = async (zelfName, authUser) => {
	const searchResults = await searchZelfName(
		{
			zelfName,
		},
		authUser
	);

	if (!searchResults.arweave?.length && !searchResults.ipfs?.length) {
		const error = new Error(`zelfName_not_found`);
		error.status = 404;
		throw error;
	}

	return searchResults.arweave?.length ? searchResults.arweave[0] : searchResults.ipfs[0];
};

/**
 * decrypt zelfName
 * @param {Object} params
 * @param {Object} authUser
 */
const decryptZelfName = async (params, authUser) => {
	const zelfNameObject = await _findZelfName(params.zelfName, authUser);

	const { face, password } = await _decryptParams(params, authUser);

	const decryptedZelfProof = await decrypt({
		zelfProof: zelfNameObject.zelfProof,
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

module.exports = {
	searchZelfName,
	leaseZelfName,
	previewZelfName,
	decryptZelfName,
};
