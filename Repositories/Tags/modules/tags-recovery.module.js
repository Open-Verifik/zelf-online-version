const TagsModule = require("./tags.module");
const TagsPartsModule = require("./tags-parts.module");
const SessionModule = require("../../Session/modules/session.module");
const { decrypt } = require("../../Wallet/modules/encryption");

const { getDomainConfig } = require("../config/supported-domains");

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

	const notFound = await TagsModule._findDuplicatedTag(tagName, domain, domainConfig);

	return { notFound, zelfProofRecord };

	const { face, password } = await TagsPartsModule.decryptParams(payload, authUser);

	const decryptedZelfProof = await decrypt({
		addServerPassword: Boolean(addServerPassword),
		faceBase64: face,
		password,
		zelfProof,
	});

	const { eth, btc, solana, sui, zkProof, mnemonic } = await TagsModule._createWalletsFromPhrase({
		faceBase64: face,
		password,
		type: "import",
		mnemonic: decryptedZelfProof.metadata.mnemonic,
	});

	const dataToEncrypt = {
		publicData: {
			ethAddress: eth.address,
			solanaAddress: solana.address,
			btcAddress: btc.address,
			suiAddress: sui.address,
			tagName: `${tagName}.${domain}`,
			domain: domain,
			domainConfig,
			origin: "online",
		},
		metadata: {
			mnemonic,
			solanaSecretKey: solana.secretKey,
			zkProof,
		},
		faceBase64: face,
		password,
		_id: `${newTagName}.${tagDomain}`,
		tolerance: payload.tolerance,
		addServerPassword: Boolean(payload.addServerPassword),
	};

	const referralTagObject = await TagsModule._validateReferral(referralTagName, authUser, tagDomain);

	const tagObject = {
		tagName: `${newTagName}.${tagDomain}`,
		domain: tagDomain,
		domainConfig,
		duration,
	};

	TagsPartsModule.assignProperties(tagObject, dataToEncrypt, { eth, btc, solana, sui }, { ...payload, password });

	await TagsPartsModule.generateZelfProof(dataToEncrypt, tagObject);

	if (tagObject.price === 0) {
		await TagsModule.confirmFreeTag(tagObject, referralTagObject, authUser);
	} else {
		await TagsModule.saveHoldTagInIPFS(tagObject, referralTagObject, authUser);
	}

	return {
		...tagObject,
		hasPassword: Boolean(password),
		pgp: await TagsPartsModule.generatePGPKeys(dataToEncrypt, { eth, btc, solana, sui }, password),
	};
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
