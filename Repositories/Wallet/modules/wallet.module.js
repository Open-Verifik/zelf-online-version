const Model = require("../models/wallet.model");
const { generateMnemonic } = require("./helpers");
const { encrypt, decrypt, preview, encryptQR } = require("./encryption");
const MongoORM = require("../../../Core/mongo-orm");
const { createEthWallet } = require("./eth");
const { createSolanaWallet } = require("./solana");
const { createBTCWallet } = require("./btc");
const sessionModule = require("../../Session/modules/session.module");
const OfflineProofModule = require("../../Mina/offline-proof");
const IPFSModule = require("../../IPFS/modules/ipfs.module");
const moment = require("moment");
const populates = [];
const ArwaveModule = require("../../Arweave/modules/arweave.module");

/**
 * @param {*} params
 * @param {*} authUser
 */
const get = async (params, authUser = {}) => {
	const queryParams = {
		...params,
	};

	return await MongoORM.buildQuery(queryParams, Model, null, populates);
};

/**
 * @param {*} params
 * @param {*} authUser
 */
const show = async (params, authUser = {}) => {
	let queryParams = {
		findOne: true,
		...params,
	};

	if (params.id || params._id) {
		queryParams.where__id = params.id || params._id;
	}

	if (authUser.clientId) {
		queryParams.where_client = authUser.clientId;
	}

	return await MongoORM.buildQuery(queryParams, Model, null, populates);
};

/**
 *
 * @param {string} zelfName
 */
const findDuplicatedZelfName = async (zelfName) => {
	let ipfsFile;

	try {
		ipfsFile = await IPFSModule.get({
			key: "zelfName",
			value: zelfName,
		});
	} catch (exception) {
		return;
	}

	if (ipfsFile) {
		const error = new Error("zelfName_is_taken");

		error.status = 409;

		throw error;
	}

	return ipfsFile;
};

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
 * @param {*} params
 * @param {*} authUser
 */
const insert = async (params, authUser = {}) => {
	const { zelfName } = params;

	await findDuplicatedZelfName(zelfName);

	params.previewZelfProof = true; // making sure the app always display it for now, for our demos

	const wallet = {};

	const mnemonic = params.mnemonic || generateMnemonic(params.wordsCount);

	const wordsArray = mnemonic.split(" ");

	if (wordsArray.length !== 12 && wordsArray.length !== 24) throw new Error("409:wallet_cannot_be_generated_phase_error");

	const eth = createEthWallet(mnemonic);
	const btc = createBTCWallet(mnemonic);
	const solana = await createSolanaWallet(mnemonic);

	const { face, password } = await _decryptParams(params, authUser);

	const zkProof = await OfflineProofModule.createProof(mnemonic);

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

	const zelfProof = await encrypt(dataToEncrypt);

	if (!zelfProof) throw new Error("409:Wallet_could_not_be_encrypted");

	if (!params.skipQRCode) {
		wallet.image = await encryptQR(dataToEncrypt);
	}

	wallet.publicData = dataToEncrypt.publicData;

	// wallet.zelfProof = await sessionModule.walletEncrypt(zelfProof, eth.address, password);

	wallet.ethAddress = eth.address;
	wallet.btcAddress = btc.address;
	wallet.solanaAddress = solana.address;
	wallet.hasPassword = Boolean(password);

	const zelfNameService = zelfName
		? await ipfsUpload(
				{
					qrCode: wallet.image,
					zelfName,
					pinIt: true,
					metadata: {
						zelfName,
						ethAddress: wallet.ethAddress,
						btcAddress: btc.address,
						evm: evmCompatibleTickers,
						solanaAddress: wallet.solanaAddress,
						hasPassword: `${wallet.hasPassword}`,
						zelfProof,
					},
				},
				{ ...authUser, pro: true }
		  )
		: {};

	return {
		...wallet,
		zelfNameService,
		zelfProof,
		metadata: params.previewZelfProof ? dataToEncrypt.metadata : undefined,
		zkProof,
	};
};

/**
 * decrypt wallet
 * @param {Object} params
 */
const decryptWallet = async (params, authUser) => {
	const { face, password } = await _decryptParams(params, authUser);

	let zelfProof = params.zelfProof;

	const zelfName = params.zelfName;

	if (!zelfProof && zelfName) {
		// TODO
	}

	if (!zelfProof) {
		const error = new Error("wallet_not_found");
		error.status = 404;
		throw error;
	}

	const decryptedWallet = await decrypt({
		zelfProof,
		faceBase64: face,
		password,
		addServerPassword: Boolean(params.addServerPassword),
	});

	if (decryptedWallet.error) {
		const error = new Error(decryptedWallet.error.code);
		error.status = 409;
		throw error;
	}

	let image;

	if (!params?.skipQRCode) {
		image = await encryptQR({ ...decryptedWallet, faceBase64: face, password });
	}

	return {
		...decryptedWallet,
		image,
		// zkProof: await OfflineProofModule.createProof(zelfProof),
		zelfProof,
	};
};

const validateZkProof = async (params, authUser) => {
	const { face, password } = await _decryptParams(params, authUser);

	let zelfProof = params.zelfProof;

	const { zelfName, zkProof } = params;

	if (!zelfProof && zelfName) {
		// TODO
	}

	if (!zelfProof) {
		const error = new Error("wallet_not_found");
		error.status = 404;
		throw error;
	}

	const decryptedZelfProof = await decrypt({
		zelfProof,
		faceBase64: face,
		password,
		addServerPassword: Boolean(params.addServerPassword),
	});

	if (decryptedZelfProof.error) {
		const error = new Error(decryptedZelfProof.error.code);
		error.status = 409;
		throw error;
	}

	const validation = await OfflineProofModule.validateProof(decryptedZelfProof.metadata.zkProof, decryptedZelfProof.metadata.mnemonic);

	return {
		sameZKProof: Boolean(zkProof === decryptedZelfProof.metadata.zkProof),
		validation,
	};
};

const seeWallet = async (params) => {
	const { addServerPassword, identifier } = params;

	const zelfProof = identifier
		? await sessionModule.sessionDecrypt(params.zelfProof, {
				identifier,
		  })
		: params.zelfProof;

	const decryptedWallet = await preview({
		zelfProof,
		addServerPassword: Boolean(addServerPassword),
	});

	return decryptedWallet;
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

/**
 * import wallet
 * @param {Object} data
 * @returns Wallet
 */
const importWallet = async (params, authUser) => {
	const { password, mnemonic, face } = await _decryptParams(params, authUser);

	const { zelfName } = params;

	await findDuplicatedZelfName(zelfName);

	const eth = createEthWallet(mnemonic);

	const solana = await createSolanaWallet(mnemonic);

	const wallet = new Model({}); // we are not saving it.

	const dataToEncrypt = {
		cleartext_data: {
			ethAddress: eth.address,
			solanaAddress: solana.address,
			_id: `${wallet._id}`,
			zelfName: params.zelfName,
		},
		metadata: {
			mnemonic,
		},
		faceBase64: face,
		password,
		_id: eth.address,
		tolerance: params.tolerance || undefined,
		addServerPassword: Boolean(params.addServerPassword),
	};

	return _saveImportedWallet(wallet, params, dataToEncrypt, password, authUser);
};

/**
 * save wallet
 * @param {Model} wallet
 * @param {Object} params
 * @param {Object} dataToEncrypt
 * @author Miguel Trevino
 */
const _saveImportedWallet = async (wallet, params, dataToEncrypt, password, authUser) => {
	const { zelfName } = params;

	const encryptedWallet = await encrypt(dataToEncrypt);

	if (!encryptedWallet) {
		const error = new Error("Wallet_could_not_be_encrypted");

		error.status = 409;

		throw error;
	}

	let zelfNameService;

	wallet.publicData = dataToEncrypt.cleartext_data;

	// wallet.zkProof = await OfflineProofModule.createProof(encryptedWallet);

	wallet.ethAddress = dataToEncrypt.cleartext_data.ethAddress;

	wallet.solanaAddress = dataToEncrypt.cleartext_data.solanaAddress;

	wallet.zelfProof = await sessionModule.walletEncrypt(encryptedWallet, wallet.ethAddress, password);

	if (wallet.image.includes("Request failed with")) {
		wallet.image = null;
	}

	wallet.hasPassword = Boolean(params.password);

	if (!params?.skipQRCode) {
		wallet.image = await encryptQR(dataToEncrypt);

		if (zelfName) {
			zelfNameService = await ipfsUpload(
				{
					qrCode: wallet.image,
					zelfName,
					pinIt: true,
					metadata: {
						zelfName,
						ethAddress: wallet.ethAddress,
						solanaAddress: wallet.solanaAddress,
						hasPassword: `${wallet.hasPassword}`,
					},
				},
				authUser
			);
		}
	}

	return {
		...wallet._doc,
		zelfNameService,
		zelfProof: params.previewZelfProof ? encryptedWallet : wallet.zelfProof,
	};
};

/**
 * search open wallets
 * @param {Object} params
 */
const searchOpenWallets = async (params, returnHash) => {
	const { address } = params;

	const wallet = await Model.findOne({
		$or: [{ ethAddress: address }, { solanaAddress: address }, { zkProof: address }],
	}).sort({ createdAt: -1 });

	if (!wallet) {
		const error = new Error("Wallet not found");
		error.status = 404;
		throw error;
	}

	return {
		_id: wallet._id,
		ethAddress: wallet.ethAddress,
		solanaAddress: wallet.solanaAddress,
		hasPassword: wallet.hasPassword,
		zelfProof: returnHash ? wallet.zelfProof : undefined,
	};
};

const ipfsUpload = async (data, authUser, forcePin = false) => {
	const { pinIt, metadata, qrCode, zelfProof, addServerPassword, zelfName } = data;

	const name = zelfName || `qrCode-${moment().unix()}`;

	let wallet;

	if (zelfProof) {
		wallet = await preview({ zelfProof, addServerPassword: Boolean(addServerPassword) });
	}

	const ipfsFile = await IPFSModule.insert(
		{
			name,
			metadata: metadata || wallet.publicData,
			pinIt,
			base64: qrCode,
			forcePin,
		},
		authUser
	);

	return ipfsFile;
};

module.exports = {
	get,
	show,
	insert,
	decryptWallet,
	seeWallet,
	importWallet,
	searchOpenWallets,
	ipfsUpload,
	validateZkProof,
};
