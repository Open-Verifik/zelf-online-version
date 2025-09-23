const { getDomainConfig } = require("../config/supported-domains");
const { _findDuplicatedTag, _validateReferral, previewZelfProof, searchTag } = require("./tags.module");
const TagsPartsModule = require("./tags-parts.module");
const { decrypt } = require("../../ZelfProof/modules/zelf-proof.module");
const moment = require("moment");
const TagsIPFSModule = require("./tags-ipfs.module");
const TagsArweaveModule = require("./tags-arweave.module");
const TagsRegistrationModule = require("./tags-registration.module");

const _getExtraPublicData = async (password, zelfProof, syncPublicData) => {
	if (!password || !zelfProof || !syncPublicData) {
		return {};
	}

	await _validatePassword(zelfProof, password);

	const extraKeys = {};

	if (syncPublicData.ethAddress) {
		extraKeys.ethAddress = syncPublicData.ethAddress;
	}
	if (syncPublicData.btcAddress) {
		extraKeys.btcAddress = syncPublicData.btcAddress;
	}
	if (syncPublicData.solanaAddress) {
		extraKeys.solanaAddress = syncPublicData.solanaAddress;
	}
	if (syncPublicData.suiAddress) {
		extraKeys.suiAddress = syncPublicData.suiAddress;
	}

	return extraKeys;
};

const _validatePassword = async (zelfProof, password) => {
	const jsonfile = require("../../../config/0012589021.json");

	let isValidPassword = true;

	try {
		await decrypt({
			faceBase64: jsonfile.mFace || jsonfile.faceBase64,
			password,
			os: "DESKTOP",
			zelfProof,
			addServerPassword: false,
		});
	} catch (exception) {
		isValidPassword = Boolean(exception.message.includes("ERR_VERIFICATION_FAILED")) || false;
	}

	if (!isValidPassword) {
		const error = new Error("tag_password_invalid");
		error.status = 409;
		throw error;
	}

	return isValidPassword;
};

const _syncOfflineTag = async (tagRecord, tagKey, syncPublicData, sync, password) => {
	const tagObject = tagRecord.tagObject;

	const ipfsRecord = tagRecord.ipfs?.length ? tagRecord.ipfs[0] : null;

	const ipfsHash = ipfsRecord.ipfs_pin_hash || ipfsRecord.ipfsHash || ipfsRecord.cid;

	const arweaveHash = tagRecord.arweave?.length ? tagRecord.arweave[0].arweave_pin_hash || tagRecord.arweave[0].arweaveHash : null;

	if (tagObject && (!sync || !syncPublicData || !password)) {
		const error = new Error(`tag_purchased_already:${tagObject.publicData[tagKey]}`);

		error.status = 409;

		throw error;
	}

	const extraParams = {
		origin: tagObject.publicData.origin || "online",
		suiAddress: tagObject.publicData.suiAddress || undefined,
		registeredAt: moment(tagObject.publicData.registeredAt).add(30, "second").format("YYYY-MM-DD HH:mm:ss"),
		expiresAt: moment(tagObject.publicData.expiresAt).add(30, "second").format("YYYY-MM-DD HH:mm:ss"),
		price: tagObject.publicData.price || undefined,
		duration: tagObject.publicData.duration || undefined,
		hasPassword: tagObject.publicData.hasPassword || undefined,
		referralTagName: tagObject.publicData.referralTagName || undefined,
		referralSolanaAddress: tagObject.publicData.referralSolanaAddress || undefined,
	};

	const metadata = {
		[tagKey]: tagObject.publicData[tagKey],
		hasPassword: tagObject.publicData.hasPassword || "false",
		ethAddress: tagObject.publicData.ethAddress || undefined,
		btcAddress: tagObject.publicData.btcAddress || undefined,
		solanaAddress: tagObject.publicData.solanaAddress || undefined,
		extraParams,
		type: tagObject.publicData.type || "hold",
		domain: tagObject.publicData.domain || undefined,
	};

	// keys to updte goes here
	// -=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=

	if (syncPublicData.suiAddress) {
		metadata.extraParams.suiAddress = syncPublicData.suiAddress;
	}

	// -=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=

	metadata.extraParams = JSON.stringify(metadata.extraParams);

	if (ipfsHash) {
		await TagsIPFSModule.deleteFiles([ipfsRecord.id]);
		// delay 1 seconds
		await new Promise((resolve) => setTimeout(resolve, 1000));
	}

	const ipfs = await TagsIPFSModule.insert(
		{
			base64: tagObject.zelfProofQRCode,
			name: tagObject.publicData[tagKey],
			metadata,
			pinIt: true,
		},
		{ pro: true }
	);

	let arweave = null;

	if (metadata.type === "mainnet") {
		// save in Arweave as well
		arweave = await TagsArweaveModule.tagRegistration(tagObject.zelfProofQRCode, {
			hasPassword: metadata.hasPassword,
			zelfProof: metadata.zelfProof,
			publicData: metadata,
		});
	}

	const updatedTagObject = {
		...tagObject,
		ipfs,
		arweave,
		origin: "offline",
		tagName: tagObject.publicData[tagKey],
	};

	return updatedTagObject;
};

/**
 * lease offline tag
 * @param {Object} params
 * @param {Object} authUser
 */
const leaseOfflineTag = async (params, authUser) => {
	const { tagName, domain, zelfProof, zelfProofQRCode, referralTagName, sync, syncPassword, syncPublicData, duration } = params;

	const domainConfig = getDomainConfig(domain);

	const tagKey = domainConfig.getTagKey();

	sync ? "do nothing" : await _findDuplicatedTag(tagName, domain, domainConfig);

	const referralTagObject = await _validateReferral(referralTagName, authUser, domainConfig);

	const decryptedParams = await TagsPartsModule.decryptParams({ password: syncPassword, removePGP: params.removePGP }, authUser);

	const { password } = decryptedParams;

	const { preview } = await previewZelfProof({ zelfProof }, authUser);

	if (preview.publicData[tagKey] !== tagName) throw new Error("tag_does_not_match_in_zelfProof");

	const findExistingTag = await searchTag({ tagName: preview.publicData[tagKey], domain, domainConfig, environment: "all" }, authUser);

	const extraPublicData = await _getExtraPublicData(password, zelfProof, syncPublicData);

	if (sync && findExistingTag?.tagObject) {
		return await _syncOfflineTag(findExistingTag, tagKey, syncPublicData, sync, password);
	}

	if (findExistingTag.tagObject) throw new Error("tag_purchased_already");

	const { price, reward, discount, discountType } = domainConfig.getPrice(
		tagName,
		duration,
		referralTagObject?.publicData?.[tagKey] ? `${referralTagObject.publicData?.[tagKey]}` : ""
	);

	const tagObject = {
		...preview.publicData,
		hasPassword: preview.passwordLayer === "WithPassword" ? "true" : "false",
		duration,
		zelfProof,
		zelfProofQRCode,
		price,
		reward,
		discount,
		discountType,
		origin: "offline",
		tagName,
	};

	if (extraPublicData?.suiAddress) {
		tagObject.suiAddress = extraPublicData.suiAddress;
	}
	if (extraPublicData?.ethAddress) {
		tagObject.ethAddress = extraPublicData.ethAddress;
	}
	if (extraPublicData?.btcAddress) {
		tagObject.btcAddress = extraPublicData.btcAddress;
	}
	if (extraPublicData?.solanaAddress) {
		tagObject.solanaAddress = extraPublicData.solanaAddress;
	}

	if (price === 0) {
		await TagsRegistrationModule.confirmFreeTag(tagObject, referralTagObject, domainConfig, authUser);
	} else {
		await TagsRegistrationModule.saveHoldTagInIPFS(tagObject, referralTagObject, domainConfig, authUser);
	}

	return tagObject;
};

module.exports = {
	leaseOfflineTag,
};
