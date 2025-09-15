const TagsModule = require("./tags.module");
const TagsPartsModule = require("./tags-parts.module");
const SessionModule = require("../../Session/modules/session.module");
const { decrypt } = require("../../Wallet/modules/encryption");
const { getDomainConfig } = require("../config/supported-domains");
const TagsRegistrationModule = require("./tags-registration.module");

/**
 * Lease recovery for Tags
 * @param {Object} payload
 * @param {Object} authUser
 * @author Miguel Trevino
 */
const leaseRecovery = async (payload, authUser) => {
	const { zelfProof, tagName, domain, type, os, addServerPassword, referralTagName } = payload;

	const duration = payload.duration || 1;

	const domainConfig = getDomainConfig(domain);

	// try to find if that zelfProof is already inside a record
	const zelfProofRecord = await TagsModule.searchTag({ key: "zelfProof", value: zelfProof, domain, domainConfig }, authUser);

	if (zelfProofRecord?.tagObject) {
		return { ...zelfProofRecord.tagObject, message: "Zelf Proof found and is being used by another tag" };
	}

	const { price } = await TagsModule._findDuplicatedTag(tagName, domain, domainConfig);

	const { face, password } = await TagsPartsModule.decryptParams(payload, authUser);

	const decryptedZelfProof = await decrypt({
		addServerPassword: Boolean(addServerPassword),
		faceBase64: face,
		password,
		zelfProof,
	});

	const referralTagObject = await TagsModule._validateReferral(referralTagName, authUser, domainConfig);

	const { eth, btc, solana, sui, zkProof, mnemonic } = await TagsModule._createWalletsFromPhrase({
		faceBase64: face,
		password,
		type: "import",
		mnemonic: decryptedZelfProof.metadata.mnemonic,
	});

	const tagKey = domainConfig.getTagKey();

	const dataToEncrypt = {
		publicData: {
			ethAddress: eth.address,
			solanaAddress: solana.address,
			btcAddress: btc.address,
			[tagKey]: tagName,
			domain: domain,
		},
		metadata: {
			mnemonic,
			solanaSecretKey: solana.secretKey,
		},
		faceBase64: face,
		password,
		_id: tagName,
		tolerance: payload.tolerance,
		addServerPassword: Boolean(payload.addServerPassword),
	};

	const tagObject = {
		...dataToEncrypt.publicData,
		duration,
	};

	const skipZelfProof = decryptedZelfProof.publicData[tagKey] === tagName;

	TagsPartsModule.assignProperties(tagObject, dataToEncrypt, { eth, btc, solana, sui }, { ...payload, password, referralTagObject }, domainConfig);

	await TagsPartsModule.generateZelfProof(dataToEncrypt, tagObject, decryptedZelfProof.publicData[tagKey] === tagName, false);

	tagObject.zelfProof = skipZelfProof ? zelfProof : tagObject.zelfProof;

	if (tagObject.price === 0) {
		await TagsRegistrationModule.confirmFreeTag(tagObject, referralTagObject, domainConfig, authUser);
	} else {
		await TagsRegistrationModule.saveHoldTagInIPFS(tagObject, referralTagObject, domainConfig, authUser);
	}

	return tagObject;
};

const _generatePGPKeys = async (dataToEncrypt, addresses, password) => {
	const { eth, solana, sui } = addresses;

	let encryptedMessage;
	let privateKey;

	const pgpKeys = await SessionModule.walletEncrypt(
		{
			mnemonic: dataToEncrypt.metadata.mnemonic,
			zkProof: dataToEncrypt.metadata.zkProof,
			solanaPrivateKey: solana.secretKey,
			suiSecretKey: sui.secretKey,
		},
		eth.address,
		password
	);

	encryptedMessage = pgpKeys.encryptedMessage;
	privateKey = pgpKeys.privateKey;

	return {
		encryptedMessage,
		privateKey,
	};
};

module.exports = {
	leaseRecovery,
};
