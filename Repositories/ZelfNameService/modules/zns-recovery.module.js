const ZNSModulev2 = require("./zns.v2.module");
const ZNSPartsModule = require("./zns-parts.module");
const SessionModule = require("../../Session/modules/session.module");
const { decrypt } = require("../../Wallet/modules/encryption");

/**
 * Lease recovery
 * @param {Object} payload
 * @author Miguel Trevino
 */
const leaseRecovery = async (payload, authUser) => {
	const { zelfProof, newZelfName, type, os, addServerPassword, referralZelfName } = payload;

	const duration = payload.duration || 1;

	await ZNSModulev2.findDuplicatedZelfName(newZelfName, "both", authUser, false);

	const { face, password } = await ZNSPartsModule.decryptParams(payload, authUser);

	const decryptedZelfProof = await decrypt({
		addServerPassword: Boolean(addServerPassword),
		faceBase64: face,
		password,
		zelfProof,
	});

	const { eth, btc, solana, sui, zkProof, mnemonic } = await ZNSModulev2.createWalletsFromPhrase(
		{
			faceBase64: face,
			password,
			type: "import",
			mnemonic: decryptedZelfProof.metadata.mnemonic,
		},
		authUser
	);

	const dataToEncrypt = {
		publicData: {
			ethAddress: eth.address,
			solanaAddress: solana.address,
			btcAddress: btc.address,
			zelfName: newZelfName,
			origin: "online",
		},
		metadata: {
			mnemonic,
			solanaSecretKey: solana.secretKey,
		},
		faceBase64: face,
		password,
		_id: newZelfName,
		tolerance: payload.tolerance,
		addServerPassword: Boolean(payload.addServerPassword),
	};

	const referralZelfNameObject = await ZNSModulev2.validateReferral(referralZelfName, authUser);

	const zelfNameObject = {
		zelfName: newZelfName,
		duration,
	};

	ZNSPartsModule.assignProperties(zelfNameObject, dataToEncrypt, { eth, btc, solana, sui }, { ...payload, password });

	await ZNSPartsModule.generateZelfProof(dataToEncrypt, zelfNameObject);

	if (zelfNameObject.price === 0) {
		await ZNSModulev2.confirmFreeZelfName(zelfNameObject, referralZelfNameObject, authUser);
	} else {
		await ZNSModulev2.saveHoldZelfNameInIPFS(zelfNameObject, referralZelfNameObject, authUser);
	}

	return {
		...zelfNameObject,
		hasPassword: Boolean(password),
		pgp: await ZNSPartsModule.generatePGPKeys(dataToEncrypt, { eth, btc, solana, sui }, password),
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
