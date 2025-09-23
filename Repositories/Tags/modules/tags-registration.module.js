const WalrusModule = require("../../Walrus/modules/walrus.module");
const TagsIPFSModule = require("./tags-ipfs.module");
const TagsArweaveModule = require("./tags-arweave.module");
const moment = require("moment");
const { getDomainConfig } = require("../config/supported-domains");

/**
 * Confirm free tag (for recovery)
 * @param {Object} tagObject - Tag object
 * @param {Object} referralTagObject - Referral tag object
 * @param {Object} domainConfig - Domain config
 * @param {Object} authUser - Authenticated user
 */
const confirmFreeTag = async (tagObject, referralTagObject, domainConfig, authUser) => {
	const storageKey = domainConfig.getTagKey();

	const tagName = tagObject[storageKey];

	const domain = tagObject.domain || "zelf";

	const metadata = {
		[storageKey]: tagName,
		domain,
		ethAddress: tagObject.ethAddress,
		solanaAddress: tagObject.solanaAddress,
		btcAddress: tagObject.btcAddress,
		extraParams: {
			origin: tagObject.origin || "online",
			price: tagObject.price,
			duration: 1,
			registeredAt: moment().format("YYYY-MM-DD HH:mm:ss"),
			expiresAt: moment().add(1, "year").format("YYYY-MM-DD HH:mm:ss"),
			type: "mainnet",
			suiAddress: tagObject.suiAddress,
			hasPassword: tagObject.hasPassword,
		},
	};

	if (referralTagObject) {
		metadata.referral = {
			tagName: referralTagObject.publicData?.[storageKey] || referralTagObject.metadata?.[storageKey],
			solanaAddress: referralTagObject.publicData?.solanaAddress || referralTagObject.metadata?.solanaAddress,
		};

		metadata.referral = JSON.stringify(metadata.referral);
	}

	tagObject.walrus = await WalrusModule.tagRegistration(
		tagObject.zelfProofQRCode,
		{ hasPassword: metadata.hasPassword, zelfProof: metadata.zelfProof, publicData: metadata },
		domainConfig
	);

	metadata.extraParams.walrus = tagObject.walrus.blobId;

	metadata.extraParams = JSON.stringify(metadata.extraParams);

	tagObject.ipfs = await TagsIPFSModule.insert(
		{
			base64: tagObject.zelfProofQRCode,
			name: tagObject[storageKey],
			metadata,
			pinIt: true,
		},
		{ ...authUser, pro: true }
	);

	tagObject.ipfs = TagsIPFSModule.formatRecord(tagObject.ipfs);

	tagObject.arweave = await TagsArweaveModule.tagRegistration(tagObject.zelfProofQRCode, {
		hasPassword: metadata.hasPassword,
		zelfProof: metadata.zelfProof,
		publicData: metadata,
		fileName: tagName,
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

	const tagKey = _domainConfig.getTagKey();

	const holdName = `${tagObject[tagKey]}${holdSuffix}`;

	const metadata = {
		[tagKey]: holdName,
		domain,
		ethAddress: tagObject.ethAddress,
		btcAddress: tagObject.btcAddress,
		solanaAddress: tagObject.solanaAddress,
		extraParams: {
			hasPassword: tagObject.hasPassword,
			type: "hold",
			origin: tagObject.origin || "online",
			registeredAt: moment().format("YYYY-MM-DD HH:mm:ss"),
			expiresAt: moment().add(30, "day").format("YYYY-MM-DD HH:mm:ss"),
		},
		suiAddress: tagObject.suiAddress,
	};

	if (referralTagObject) {
		metadata.referral = {
			tagName: referralTagObject.publicData?.[tagKey] || referralTagObject.metadata?.[tagKey],
			solanaAddress: referralTagObject.publicData?.solanaAddress || referralTagObject.metadata?.solanaAddress,
		};

		metadata.referral = JSON.stringify(metadata.referral);
	}

	metadata.extraParams = JSON.stringify(metadata.extraParams);

	tagObject.ipfs = await TagsIPFSModule.insert(
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
	confirmFreeTag,
	saveHoldTagInIPFS,
};
