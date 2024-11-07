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

/**
 *
 * @param {*} params
 * @param {*} authUser
 */
const searchZelfName = async (params, authUser) => {
	const searchResults = await ArweaveModule.search(params.zelfName, {});

	const zelfNames = [];

	for (let index = 0; index < searchResults.length; index++) {
		const zelfNameObject = await _formatArweaveSearchResult(searchResults[index]);

		zelfNames.push(zelfNameObject);
	}

	return zelfNames;
};

const _formatArweaveSearchResult = async (transactionRecord) => {
	const zelfNameObject = {
		id: transactionRecord.node?.id,
		tags: transactionRecord.node?.tags,
		url: `${arweaveUrl}/${transactionRecord.node?.id}`,
		explorerUrl: `${explorerUrl}/${transactionRecord.node?.id}`,
	};

	const zelfProofTag = transactionRecord.node?.tags.find((tag) => tag.name === "zelfProof");

	const zelfNameTag = transactionRecord.node?.tags.find((tag) => tag.name === "zelfName");

	zelfNameObject.zelfProof = zelfProofTag ? zelfProofTag.value : null;

	zelfNameObject.zelfName = zelfNameTag.value;

	zelfNameObject.zelfProofQRCode = await _convertZelfProofToBase64(zelfNameObject.id);

	return zelfNameObject;
};

const _convertZelfProofToBase64 = async (id) => {
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

	const mnemonic = params.type === "import" ? params.mnemonic : generateMnemonic(params.wordsCount);

	const wordsArray = mnemonic.split(" ");

	if (wordsArray.length !== 12 && wordsArray.length !== 24) throw new Error("409:wallet_cannot_be_generated_phase_error");

	const eth = createEthWallet(mnemonic);
	const btc = createBTCWallet(mnemonic);
	const solana = await createSolanaWallet(mnemonic);
	const { face, password } = await _decryptParams(params, authUser);
	const zkProof = await OfflineProofModule.createProof(mnemonic);
	const zelfNameObject = {};

	const dataToEncrypt = {
		publicData: {
			ethAddress: eth.address,
			evm: evmCompatibleTickers,
			solanaAddress: solana.address,
			btcAddress: btc.address,
			zelfName,
		},
		metadata: {
			mnemonic,
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

	if (!params.skipQRCode) {
		zelfNameObject.image = await encryptQR(dataToEncrypt);

		zelfNameObject.leaseTransaction = await ArweaveModule.uploadZelfProof(zelfNameObject.image, zelfNameObject);
	}

	return zelfNameObject;
};

const _decryptParams = async (data, authUser) => {
	if (data.removePGP) {
		return {
			password: data.password,
			mnemonic: data.phrase,
			face: data.faceBase64,
		};
	}

	const password = data.password ? await sessionModule.sessionDecrypt(data.password, authUser) : undefined;

	const mnemonic = data.phrase ? await sessionModule.sessionDecrypt(data.phrase, authUser) : undefined;

	const face = data.faceBase64 ? await sessionModule.sessionDecrypt(data.faceBase64, authUser) : undefined;

	return { password, mnemonic, face };
};

const _findDuplicatedZelfName = async (zelfName, authUser) => {
	try {
		await searchZelfName({ zelfName }, authUser);
	} catch (exception) {
		return null;
	}

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
	const searchResults = await ArweaveModule.search(params.zelfName, {});

	const zelfNames = [];

	// now let's get the image and put as base64
	for (let index = 0; index < searchResults.length; index++) {
		const transactionRecord = searchResults[index];

		const zelfName = {
			id: transactionRecord.node?.id,
			// tags: transactionRecord.node?.tags,
			url: `${arweaveUrl}/${transactionRecord.node?.id}`,
			explorerUrl: `${explorerUrl}/${transactionRecord.node?.id}`,
		};
		// Find the "zelfProof" tag and get its value
		const zelfProofTag = transactionRecord.node?.tags.find((tag) => tag.name === "zelfProof");
		zelfName.zelfProof = zelfProofTag ? zelfProofTag.value : null;

		// Pass the zelfProof to the preview function
		if (zelfName.zelfProof) {
			zelfName.preview = await preview({ zelfProof: zelfName.zelfProof });
		}

		zelfName.zelfProofQRCode = await _convertZelfProofToBase64(zelfName.id);

		zelfNames.push(zelfName);
	}

	return zelfNames;
};

/**
 * decrypt zelfName
 * @param {Object} params
 * @param {Object} authUser
 */
const decryptZelfName = async (params, authUser) => {
	const zelfNameObject = await searchZelfName(
		{
			zelfName: params.zelfName,
		},
		authUser
	);

	const { face, password } = await _decryptParams(params, authUser);

	const decryptedZelfProof = await decrypt({
		zelfProof: zelfNameObject[0].zelfProof,
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
		...zelfNameObject[0],
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
