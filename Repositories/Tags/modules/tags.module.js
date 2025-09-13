const moment = require("moment");
const ArweaveModule = require("../../Arweave/modules/arweave.module");
const TagsPartsModule = require("./tags-parts.module");
const TagsSearchModule = require("./tags-search.module");
const { generateMnemonic } = require("../../Wallet/modules/helpers");
const { createEthWallet } = require("../../Wallet/modules/eth");
const { createSolanaWallet } = require("../../Wallet/modules/solana");
const { createBTCWallet } = require("../../Wallet/modules/btc");
const { generateSuiWalletFromMnemonic } = require("../../Wallet/modules/sui");
const { decrypt, encrypt, preview, encryptQR } = require("../../Wallet/modules/encryption");
const OfflineProofModule = require("../../Mina/offline-proof");
const IPFSModule = require("../../IPFS/modules/ipfs.module");
const config = require("../../../Core/config");
const { confirmPayUniqueAddress } = require("../../purchase-zelf/modules/balance-checker.module");
const { addReferralReward, addPurchaseReward } = require("./tags-token.module");
const { initTagUpdates, updateTags } = require("./sync-tag-records.module");
const WalrusModule = require("../../Walrus/modules/walrus.module");
const { generateHoldDomain } = require("./domain-registry.module");
const { getDomainConfig } = require("../config/supported-domains");
const TagsIPFSModule = require("./tags-ipfs.module");

/**
 * Generate domain-specific hold domain
 * @param {string} domain - Domain name
 * @param {string} name - Tag name
 * @returns {string} - Hold domain
 */
const generateDomainHoldDomain = (domain, name) => {
	try {
		return generateHoldDomain(domain, name);
	} catch (error) {
		console.error(`Error generating hold domain for ${domain}:`, error);
		return generateHoldDomain("zelf", name); // Fallback to zelf
	}
};

/**
 * lease tag
 * @param {Object} params
 * @param {Object} authUser
 */
const leaseTag = async (params, authUser) => {
	const { tagName, domain, duration, referralTagName } = params;

	const domainConfig = getDomainConfig(domain);

	await _findDuplicatedTag(tagName, domain, "both", domainConfig);

	const referralTagObject = await _validateReferral(referralTagName, authUser, domain);

	const decryptedParams = await TagsPartsModule.decryptParams(params, authUser);

	const { face, password } = decryptedParams;

	const { eth, btc, solana, sui, zkProof, mnemonic } = await _createWalletsFromPhrase({
		...params,
		mnemonic: decryptedParams.mnemonic,
	});

	const dataToEncrypt = {
		publicData: {
			ethAddress: eth.address,
			solanaAddress: solana.address,
			btcAddress: btc.address,
			[domainConfig.storage.keyPrefix]: tagName,
			domain,
		},
		metadata: {
			mnemonic,
			solanaSecretKey: solana.secretKey,
		},
		faceBase64: face,
		password,
		_id: tagName,
		tolerance: params.tolerance,
		addServerPassword: Boolean(params.addServerPassword),
	};

	const tagObject = {
		...dataToEncrypt.publicData,
		duration,
	};

	TagsPartsModule.assignProperties(tagObject, dataToEncrypt, { eth, btc, solana, sui }, { ...params, password }, domainConfig);

	await TagsPartsModule.generateZelfProof(dataToEncrypt, tagObject);

	if (tagObject.price === 0) {
		await confirmFreeTag(tagObject, referralTagObject, domainConfig, authUser);
	} else {
		await saveHoldTagInIPFS(tagObject, referralTagObject, domainConfig, authUser);
	}

	return tagObject;
};

/**
 * search tag
 * @param {Object} params
 * @param {Object} authUser
 */
const searchTag = async (params, authUser) => {
	const { tagName, domain, key, value, environment, type, duration } = params;

	const domainConfig = getDomainConfig(domain);

	const result = await TagsSearchModule.searchTag(
		{
			tagName,
			domain,
			key,
			value,
			environment,
			type,
			domainConfig,
		},
		authUser
	);

	return result;
};

/**
 * decrypt tag
 * @param {Object} params
 * @param {Object} authUser
 */
const decryptTag = async (params, authUser) => {
	const { tagName, domain } = params;
	const domainConfig = getDomainConfig(domain);

	const tagObjects = await _findTag({ tagName: `${tagName}.${domain}`, domain }, "both", authUser);

	const tagObject = {
		...(tagObjects.arweave?.[0] || {}),
		...(tagObjects.ipfs?.[0] || {}),
	};

	const { face, password } = await _decryptParams(params, authUser);

	const decryptedZelfProof = await decrypt({
		addServerPassword: Boolean(params.addServerPassword),
		faceBase64: face,
		password,
		zelfProof: tagObject.publicData.zelfProof || params.zelfProof,
	});

	if (decryptedZelfProof.error) {
		const error = new Error(decryptedZelfProof.error.code);
		error.status = 409;
		throw error;
	}

	const { mnemonic, zkProof, solanaSecretKey } = decryptedZelfProof.metadata;

	const { encryptedMessage, privateKey, tagsToAdd } = await initTagUpdates(tagObject, {
		mnemonic,
		zkProof,
		solanaSecretKey,
		password,
	});

	if (tagsToAdd.length) {
		const { ipfs, arweave } = await updateTags(tagObject, tagsToAdd);

		tagObject.updatedIpfs = ipfs;
		tagObject.updatedArweave = arweave;

		for (let index = 0; index < tagsToAdd.length; index++) {
			const tag = tagsToAdd[index];
			tagObject.publicData[tag.name] = tag.value;
		}
	}

	if (!tagObject.zelfProofQRCode) tagObject.zelfProofQRCode = await TagsPartsModule.urlToBase64(tagObject.url);

	return {
		...tagObject,
		domain,
		domainConfig,
		decryptedZelfProof: {
			mnemonic,
			zkProof,
			solanaSecretKey,
		},
	};
};

/**
 * preview tag
 * @param {Object} params
 * @param {Object} authUser
 */
const previewTag = async (params, authUser) => {
	const { tagName, domain } = params;
	const domainConfig = getDomainConfig(domain);

	const tagObjects = await _findTag({ tagName: `${tagName}.${domain}`, domain }, "both", authUser);

	const tagObject = {
		...(tagObjects.arweave?.[0] || {}),
		...(tagObjects.ipfs?.[0] || {}),
	};

	if (!tagObject.publicData) {
		return {
			available: true,
			tagName: `${tagName}.${domain}`,
			domain,
			domainConfig,
		};
	}

	return {
		available: false,
		tagName: `${tagName}.${domain}`,
		domain,
		domainConfig,
		tagObject,
	};
};

/**
 * preview ZelfProof
 * @param {Object} params
 * @param {Object} authUser
 */
const previewZelfProof = async (params, authUser) => {
	const { zelfProof } = params;

	const previewResult = await preview({
		zelfProof,
		verifierKey: config.zelfEncrypt.serverKey,
	});

	return {
		preview: previewResult,
		zelfProof,
	};
};

/**
 * lease offline tag
 * @param {Object} params
 * @param {Object} authUser
 */
const leaseOfflineTag = async (params, authUser) => {
	const { tagName, domain, zelfProof, zelfProofQRCode } = params;
	const domainConfig = getDomainConfig(domain);

	await _findDuplicatedTag(tagName, domain, "both", domainConfig);

	const offlineProof = await OfflineProofModule.createOfflineProof({
		zelfProof,
		zelfProofQRCode,
		tagName: `${tagName}.${domain}`,
		domain,
		domainConfig,
	});

	return {
		tagName: `${tagName}.${domain}`,
		domain,
		domainConfig,
		offlineProof,
	};
};

/**
 * lease confirmation
 * @param {Object} params
 * @param {Object} authUser
 */
const leaseConfirmation = async (params, authUser) => {
	const { tagName, domain, coin, network } = params;
	const domainConfig = getDomainConfig(domain);

	const confirmation = await confirmPayUniqueAddress({
		tagName: `${tagName}.${domain}`,
		domain,
		domainConfig,
		coin,
		network,
	});

	return {
		tagName: `${tagName}.${domain}`,
		domain,
		domainConfig,
		confirmation,
	};
};

/**
 * ZelfPay
 * @param {Object} params
 * @param {Object} authUser
 */
const zelfPay = async (params, authUser) => {
	const { zelfProof } = params;

	const zelfPayResult = await WalrusModule.createZelfPay({
		zelfProof,
		verifierKey: config.zelfEncrypt.serverKey,
	});

	return {
		zelfPay: zelfPayResult,
		zelfProof,
	};
};

/**
 * create ZelfPay
 * @param {Object} tagObject
 * @param {Object} authUser
 * @param {string} domain
 */
const createZelfPay = async (tagObject, authUser, domain = "zelf") => {
	const domainConfig = getDomainConfig(domain);

	const zelfPayResult = await WalrusModule.createZelfPay({
		zelfProof: tagObject.publicData.zelfProof,
		verifierKey: config.zelfEncrypt.serverKey,
		domain,
		domainConfig,
	});

	return {
		zelfPay: zelfPayResult,
		tagObject,
		domain,
		domainConfig,
	};
};

/**
 * update tag
 * @param {Object} params
 * @param {Object} authUser
 */
const updateTag = async (params, authUser) => {
	const { tagName, domain, duration } = params;
	const domainConfig = getDomainConfig(domain);

	const tagObjects = await _findTag({ tagName: `${tagName}.${domain}`, domain }, "both", authUser);

	const tagObject = {
		...(tagObjects.arweave?.[0] || {}),
		...(tagObjects.ipfs?.[0] || {}),
	};

	if (!tagObject.publicData) {
		const error = new Error("Tag not found");
		error.status = 404;
		throw error;
	}

	// Update expiration date
	const newExpiresAt = moment(tagObject.publicData.expiresAt).add(duration, "year").toISOString();

	// Update the tag object
	tagObject.publicData.expiresAt = newExpiresAt;
	tagObject.publicData.updatedAt = moment().toISOString();

	// Store updated version in IPFS
	const ipfsResult = await IPFSModule.insert(
		{
			base64: Buffer.from(JSON.stringify(tagObject, null, 2)).toString("base64"),
			metadata: {
				...tagObject.publicData,
				type: "tag",
				domain,
			},
			name: `${tagName}.${domain}`,
			pinIt: true,
		},
		{ pro: true }
	);

	// Store updated version in Arweave
	const arweaveResult = await ArweaveModule.insert(
		{
			base64: Buffer.from(JSON.stringify(tagObject, null, 2)).toString("base64"),
			metadata: {
				...tagObject.publicData,
				type: "tag",
				domain,
			},
			name: `${tagName}.${domain}`,
		},
		{ pro: true }
	);

	return {
		tagName: `${tagName}.${domain}`,
		domain,
		domainConfig,
		ipfs: ipfsResult,
		arweave: arweaveResult,
		expiresAt: newExpiresAt,
		updatedAt: tagObject.publicData.updatedAt,
	};
};

/**
 * Find duplicated tag
 * @param {string} tagName
 * @param {string} domain
 * @param {string} storage
 * @param {Object} domainConfig
 */
const _findDuplicatedTag = async (tagName, domain, storage, domainConfig) => {
	const storageKey = domainConfig.storage.keyPrefix;

	const searchParams = {
		tagName,
		domain,
		domainConfig,
		storageKey,
		environment: "all",
	};

	const result = await TagsSearchModule.searchTag(searchParams);

	if (result.available === false) {
		const error = new Error("409:tag_already_exists");
		error.status = 409;
		throw error;
	}
};

/**
 * Find tag
 * @param {Object} params
 * @param {string} storage
 * @param {Object} authUser
 */
const _findTag = async (params, storage, authUser) => {
	const { tagName, domain } = params;
	const domainConfig = getDomainConfig(domain);
	const storageKey = domainConfig.storage.keyPrefix;

	const searchParams = {
		tagName,
		domain,
		domainConfig,
		storageKey,
	};

	return await TagsSearchModule.searchTag(searchParams, authUser);
};

/**
 * Validate referral
 * @param {string} referralTagName
 * @param {Object} authUser
 * @param {string} domain
 */
const _validateReferral = async (referralTagName, authUser, domain = "zelf") => {
	if (!referralTagName) return null;

	const domainConfig = getDomainConfig(domain);
	const storageKey = domainConfig.storage.keyPrefix;

	const searchParams = {
		tagName: `${referralTagName}.${domain}`,
		domain,
		domainConfig,
		storageKey,
	};

	const result = await TagsSearchModule.searchTag(searchParams, authUser);

	if (result.available === false) {
		return result.tagObject;
	}

	return null;
};

/**
 * Create wallets from phrase
 * @param {Object} params
 */
const _createWalletsFromPhrase = async (params) => {
	const _mnemonic = params.type === "import" ? params.mnemonic : generateMnemonic(params.wordsCount);

	const wordsArray = _mnemonic.split(" ");

	if (wordsArray.length !== 12 && wordsArray.length !== 24) throw new Error("409:mnemonic_invalid");

	const eth = await createEthWallet(_mnemonic);
	const btc = await createBTCWallet(_mnemonic);
	const solana = await createSolanaWallet(_mnemonic);
	const sui = await generateSuiWalletFromMnemonic(_mnemonic);

	const zkProof = await OfflineProofModule.createProof(_mnemonic);

	return {
		eth,
		btc,
		solana,
		sui,
		zkProof,
		mnemonic: _mnemonic,
	};
};

/**
 * Decrypt params
 * @param {Object} params
 * @param {Object} authUser
 */
const _decryptParams = async (params, authUser) => {
	const { faceBase64, password } = params;

	const decryptedFace = await decrypt({
		faceBase64,
		password,
		verifierKey: config.zelfEncrypt.serverKey,
	});

	if (decryptedFace.error) {
		const error = new Error(decryptedFace.error.code);
		error.status = 409;
		throw error;
	}

	return {
		face: decryptedFace.face,
		password,
	};
};

/**
 * Confirm free tag (for recovery)
 * @param {Object} tagObject - Tag object
 * @param {Object} referralTagObject - Referral tag object
 * @param {Object} domainConfig - Domain config
 * @param {Object} authUser - Authenticated user
 */
const confirmFreeTag = async (tagObject, referralTagObject, domainConfig, authUser) => {
	const tagName = tagObject[domainConfig.storage.keyPrefix];

	const domain = tagObject.domain || "zelf";
	const storageKey = domainConfig.storage.keyPrefix;

	const metadata = {
		hasPassword: tagObject.hasPassword,
		zelfProof: tagObject.zelfProof,
		[storageKey]: tagName,
		domain,
		ethAddress: tagObject.ethAddress,
		solanaAddress: tagObject.solanaAddress,
		btcAddress: tagObject.btcAddress,
		suiAddress: tagObject.suiAddress,
		extraParams: {
			origin: tagObject.origin || "online",
			price: tagObject.price,
			duration: tagObject.duration || 1,
			registeredAt: moment().format("YYYY-MM-DD HH:mm:ss"),
			expiresAt: moment().add(1, "year").format("YYYY-MM-DD HH:mm:ss"),
			type: "mainnet",
		},
	};

	if (referralTagObject) {
		metadata.extraParams.referralTagName = referralTagObject.publicData?.[storageKey] || referralTagObject.metadata?.[storageKey];
		metadata.extraParams.referralDomain = referralTagObject.publicData?.domain || referralTagObject.metadata?.domain || domain;
		metadata.extraParams.referralSolanaAddress = referralTagObject.publicData?.solanaAddress || referralTagObject.metadata?.solanaAddress;
	}

	tagObject.walrus = await WalrusModule.tagRegistration(tagObject.zelfProofQRCode, {
		hasPassword: metadata.hasPassword,
		zelfProof: metadata.zelfProof,
		publicData: metadata,
		domain,
		domainConfig,
	});

	metadata.extraParams.walrus = tagObject.walrus.blobId;
	metadata.extraParams = JSON.stringify(metadata.extraParams);

	tagObject.ipfs = await IPFSModule.insert(
		{
			base64: tagObject.zelfProofQRCode,
			name: tagObject[storageKey],
			metadata,
			pinIt: true,
		},
		{ ...authUser, pro: true }
	);

	tagObject.ipfs = TagsIPFSModule.formatRecord(tagObject.ipfs);
	delete tagObject.ipfs.publicData.zelfProof;

	if (!tagObject.publicData) tagObject.publicData = {};
	tagObject.publicData = Object.assign(tagObject.publicData, tagObject.ipfs.publicData);

	tagObject.arweave = await ArweaveModule.tagRegistration(tagObject.zelfProofQRCode, {
		hasPassword: metadata.hasPassword,
		zelfProof: metadata.zelfProof,
		publicData: metadata,
		domain,
		domainConfig,
	});
};

/**
 * Save hold tag in IPFS (for recovery)
 * @param {Object} tagObject - Tag object
 * @param {Object} referralTagObject - Referral tag object
 * @param {Object} authUser - Authenticated user
 */
const saveHoldTagInIPFS = async (tagObject, referralTagObject, domainConfig, authUser) => {
	const domain = tagObject.domain || "zelf";

	const _domainConfig = domainConfig || getDomainConfig(domain);

	const holdSuffix = _domainConfig?.holdSuffix || ".hold";

	const storageKey = _domainConfig.storage.keyPrefix;

	const holdName = `${tagObject[storageKey]}${holdSuffix}`;

	const metadata = {
		zelfProof: tagObject.zelfProof,
		[storageKey]: holdName,
		domain,
		ethAddress: tagObject.ethAddress,
		btcAddress: tagObject.btcAddress,
		solanaAddress: tagObject.solanaAddress,
		extraParams: {
			hasPassword: tagObject.hasPassword,
			duration: tagObject.duration || 1,
			type: "hold",
			origin: tagObject.origin || "online",
			price: tagObject.price,
			registeredAt: moment().format("YYYY-MM-DD HH:mm:ss"),
			expiresAt: moment().add(30, "day").format("YYYY-MM-DD HH:mm:ss"),
			suiAddress: tagObject.suiAddress,
		},
	};

	if (referralTagObject) {
		metadata.extraParams.referralTagName = referralTagObject.publicData?.[storageKey] || referralTagObject.metadata?.[storageKey];

		metadata.extraParams.referralSolanaAddress = referralTagObject.publicData?.solanaAddress || referralTagObject.metadata?.solanaAddress;
	}

	metadata.extraParams = JSON.stringify(metadata.extraParams);

	tagObject.ipfs = await IPFSModule.insert(
		{
			base64: tagObject.zelfProofQRCode,
			name: holdName,
			metadata,
			pinIt: true,
		},
		{ ...authUser, pro: true }
	);

	tagObject.ipfs = TagsIPFSModule.formatRecord(tagObject.ipfs);
};

module.exports = {
	leaseTag,
	searchTag,
	decryptTag,
	previewTag,
	previewZelfProof,
	leaseOfflineTag,
	leaseConfirmation,
	zelfPay,
	createZelfPay,
	updateTag,
	// Utility functions
	getDomainConfig,
	generateDomainHoldDomain,
	_findDuplicatedTag,
	_findTag,
	_validateReferral,
	_createWalletsFromPhrase,
	_decryptParams,
};
