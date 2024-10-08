const Model = require("../models/wallet.model");
const { generateMnemonic } = require("./helpers");
const { encrypt, decrypt, preview, encryptQR } = require("./encryption");
const MongoORM = require("../../../Core/mongo-orm");
const { createEthWallet } = require("./eth");
const { createSolanaWallet } = require("./solana");
const sessionModule = require("../../Session/modules/session.module");
const OfflineProofModule = require("../../Mina/offline-proof");
const IPFSModule = require("../../IPFS/modules/ipfs.module");
const moment = require("moment");
const populates = [];

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
 * @param {*} params
 * @param {*} authUser
 */
const insert = async (params, authUser = {}) => {
	const { zelfName } = params;

	const wallet = new Model({});

	const mnemonic = params.mnemonic || generateMnemonic(params.wordsCount);

	const words = {};

	const wordsArray = mnemonic.split(" ");

	if (wordsArray.length !== 12 && wordsArray.length !== 24) {
		throw new Error("409:wallet_cannot_be_generated_phase_error");
	}

	const eth = createEthWallet(mnemonic);

	const solana = await createSolanaWallet(mnemonic);

	for (let index = 0; index < wordsArray.length; index++) {
		const word = wordsArray[index];

		words[index + 1] = word;
	}

	const { face, password } = await _decryptParams(params, authUser);

	const dataToEncrypt = {
		cleartext_data: {
			ethAddress: eth.address,
			solanaAddress: solana.address,
			_id: wallet._id,
		},
		metadata: {
			mnemonic,
		},
		faceBase64: face,
		password,
		_id: wallet._id,
		tolerance: params.tolerance,
		addServerPassword: Boolean(params.addServerPassword),
	};

	const encryptedWallet = await encrypt(dataToEncrypt);

	if (!encryptedWallet) throw new Error("409:Wallet_could_not_be_encrypted");

	const response = {
		encryptedWallet,
	};

	if (params.seeWallet) {
		response.metadata = dataToEncrypt.metadata;
		response.cleartext_data = dataToEncrypt.cleartext_data;
		response.record_id = wallet._id;
		response.mnemonic = mnemonic;
	}

	let qrCode = null;

	if (!params.skipQRCode) {
		wallet.image = await encryptQR(dataToEncrypt);
	}

	wallet.publicData = dataToEncrypt.cleartext_data;

	wallet.zelfProof = await sessionModule.walletEncrypt(encryptedWallet, eth.address, password);

	// wallet.zkProof = await OfflineProofModule.createProof(encryptedWallet);

	wallet.ethAddress = eth.address;

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
						solanaAddress: wallet.solanaAddress,
						hasPassword: `${wallet.hasPassword}`,
						zelfProof: encryptedWallet,
					},
				},
				{ ...authUser, pro: true }
		  )
		: {};

	return {
		...wallet.toJSON(),
		qrCode,
		zelfNameService,
		zelfProof: encryptedWallet,
		metadata: params.seeWallet ? dataToEncrypt.metadata : undefined,
	};
};

/**
 * decrypt wallet
 * @param {Object} params
 */
const decryptWallet = async (params, authUser) => {
	const { face, password } = await _decryptParams(params, authUser);

	let zelfProof = params.zelfProof;

	if (!zelfProof) {
		const wallet = await searchOpenWallets(
			{
				address: params.identifier,
			},
			true
		);

		if (!wallet) {
			const error = new Error("wallet_not_found");

			error.status = 404;

			throw error;
		}

		// decrypt hash
		zelfProof = await sessionModule.walletDecrypt(wallet.zelfProof, wallet.ethAddress, password);
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
const importWallet = async (data, authUser) => {
	const { password, mnemonic, face } = await _decryptParams(data, authUser);

	const eth = createEthWallet(mnemonic);

	const solana = await createSolanaWallet(mnemonic);

	const wallet = new Model({}); // we are not saving it.

	const dataToEncrypt = {
		cleartext_data: {
			ethAddress: eth.address,
			solanaAddress: solana.address,
			_id: `${wallet._id}`,
		},
		metadata: {
			mnemonic,
		},
		faceBase64: face,
		password,
		_id: eth.address,
		tolerance: data.tolerance || undefined,
		addServerPassword: Boolean(data.addServerPassword),
	};

	return _saveImportedWallet(wallet, data, dataToEncrypt, password, authUser);
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

	console.log({ ipfsFile });

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
};
