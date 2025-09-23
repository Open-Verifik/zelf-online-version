const moment = require("moment");
const TagsPartsModule = require("./tags-parts.module");
const TagsSearchModule = require("./tags-search.module");
const { generateMnemonic } = require("../../Wallet/modules/helpers");
const { createEthWallet } = require("../../Wallet/modules/eth");
const { createSolanaWallet } = require("../../Wallet/modules/solana");
const { createBTCWallet } = require("../../Wallet/modules/btc");
const { generateSuiWalletFromMnemonic } = require("../../Wallet/modules/sui");
const { decrypt, preview } = require("../../ZelfProof/modules/zelf-proof.module");
const OfflineProofModule = require("../../Mina/offline-proof");

const config = require("../../../Core/config");
const { confirmPayUniqueAddress } = require("../../purchase-zelf/modules/balance-checker.module");
const { initTagUpdates, updateTags } = require("./sync-tag-records.module");
const WalrusModule = require("../../Walrus/modules/walrus.module");
const { generateHoldDomain } = require("./domain-registry.module");
const { getDomainConfig } = require("../config/supported-domains");
const TagsRegistrationModule = require("./tags-registration.module");

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
		return generateHoldDomain("zelf", name); // Fallback to zelf
	}
};

/**
 * lease tag
 * @param {Object} params
 * @param {Object} authUser
 */
const leaseTag = async (params, authUser) => {
	const { tagName, domain, referralTagName } = params;

	const _tagName = TagsPartsModule.getFullTagName(tagName, domain);

	const domainConfig = getDomainConfig(domain);

	if (!domainConfig) throw new Error(`Unsupported domain: ${domain}`);

	// Get tag key using the method
	const tagKey = domainConfig.getTagKey();

	await _findDuplicatedTag(_tagName, domain, domainConfig);

	const referralTagObject = await _validateReferral(referralTagName, authUser, domainConfig);

	const decryptedParams = await TagsPartsModule.decryptParams(params, authUser);

	const { face, password } = decryptedParams;

	const { eth, btc, solana, sui, zkProof, mnemonic } = await _createWalletsFromPhrase(params.type, params.mnemonic, params.wordsCount);

	const dataToEncrypt = {
		publicData: {
			ethAddress: eth.address,
			solanaAddress: solana.address,
			btcAddress: btc.address,
			[tagKey]: _tagName,
			domain,
		},
		metadata: {
			mnemonic,
			solanaSecretKey: solana.secretKey,
		},
		faceBase64: face,
		password,
		_id: _tagName,
		tolerance: params.tolerance,
		addServerPassword: Boolean(params.addServerPassword),
	};

	const tagObject = {
		...dataToEncrypt.publicData,
	};

	TagsPartsModule.assignProperties(tagObject, dataToEncrypt, { eth, btc, solana, sui }, { ...params, password, referralTagObject }, domainConfig);

	await TagsPartsModule.generateZelfProof(dataToEncrypt, tagObject);

	if (tagObject.price === 0) {
		await TagsRegistrationModule.confirmFreeTag(tagObject, referralTagObject, domainConfig, authUser);
	} else {
		await TagsRegistrationModule.saveHoldTagInIPFS(tagObject, referralTagObject, domainConfig, authUser);
	}

	return tagObject;
};

/**
 * search tag
 * @param {Object} params
 * @param {Object} authUser
 */
const searchTag = async (params, authUser) => {
	const { tagName, domain, key, value, environment, type, domainConfig, duration } = params;

	const _tagName = TagsPartsModule.getFullTagName(tagName, domain);

	const _domainConfig = domainConfig || getDomainConfig(domain);

	console.log({ _tagName });

	const result = await TagsSearchModule.searchTag(
		{
			tagName: _tagName,
			domain,
			key,
			value,
			environment: environment || "all",
			type: type || "both",
			domainConfig: _domainConfig,
			duration: duration || "1",
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

	const searchResult = await searchTag({ tagName, domain, domainConfig, environment: "all" }, authUser);

	if (searchResult.available) return searchResult;

	const tagObject = searchResult.tagObject;

	const { face, password } = await _decryptParams(params, authUser);

	console.log({ tagObject: tagObject.zelfProof });

	if (!tagObject.zelfProof) throw new Error("409:zelf_proof_not_found");

	const decryptedZelfProof = await decrypt({
		addServerPassword: Boolean(params.addServerPassword),
		faceBase64: face,
		password,
		zelfProof: tagObject.zelfProof,
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

	return {
		...tagObject,
		domain,
		metadata: {
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
	const domainConfig = getDomainConfig(params.domain);

	const searchResult = await searchTag({ ...params, domainConfig, environment: "all" }, authUser);

	if (searchResult.available) return searchResult;

	const previewResult = await preview({
		zelfProof: searchResult.tagObject.publicData.zelfProof,
		addServerPassword: Boolean(params.addServerPassword),
	});

	return { preview: previewResult, tagObject: searchResult.tagObject };
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
		addServerPassword: Boolean(params.addServerPassword),
	});

	return {
		preview: previewResult,
		zelfProof,
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

	const _tagName = TagsPartsModule.getFullTagName(tagName, domain);

	const confirmation = await confirmPayUniqueAddress({
		tagName: _tagName,
		domain,
		domainConfig,
		coin,
		network,
	});

	return {
		tagName: _tagName,
		domain,
		domainConfig,
		confirmation,
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
 * Find duplicated tag
 * @param {string} tagName
 * @param {string} domain
 * @param {string} storage
 * @param {Object} domainConfig
 */
const _findDuplicatedTag = async (tagName, domain, domainConfig) => {
	const searchParams = {
		tagName,
		domain,
		domainConfig,
		environment: "all",
	};

	const result = await TagsSearchModule.searchTag(searchParams);

	if (result.available === false) {
		const error = new Error("409:tag_already_exists");
		error.status = 409;
		throw error;
	}

	return result;
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

	const searchParams = {
		tagName,
		domain,
		domainConfig,
	};

	return await TagsSearchModule.searchTag(searchParams, authUser);
};

/**
 * Validate referral
 * @param {string} referralTagName
 * @param {Object} authUser
 * @param {Domain} domainConfig
 */
const _validateReferral = async (referralTagName, authUser, domainConfig) => {
	if (!referralTagName) return null;

	const domain = domainConfig.name;

	const searchParams = {
		tagName: TagsPartsModule.getFullTagName(referralTagName, domain),
		domain,
		domainConfig,
		environment: "all",
	};

	const result = await TagsSearchModule.searchTag(searchParams, authUser);

	if (result.available === false) return result.tagObject;

	return null;
};

/**
 * Create wallets from phrase
 * @param {string} type
 * @param {string} mnemonic
 * @param {number} wordsCount default 12
 */
const _createWalletsFromPhrase = async (type, mnemonic, wordsCount = 12) => {
	const _mnemonic = type === "import" ? mnemonic : generateMnemonic(wordsCount);

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
	if (params.removePGP) {
		return {
			password: params.password,
			mnemonic: params.mnemonic,
			face: params.faceBase64,
		};
	}

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

module.exports = {
	leaseTag,
	searchTag,
	decryptTag,
	previewTag,
	previewZelfProof,
	leaseConfirmation,
	createZelfPay,
	// Utility functions
	getDomainConfig,
	generateDomainHoldDomain,
	_findDuplicatedTag,
	_validateReferral,
	_createWalletsFromPhrase,
	_decryptParams,
};
