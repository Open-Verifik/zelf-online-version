const ZNSModulev2 = require("./zns.v2.module");
const { decrypt, encrypt, preview, encryptQR } = require("../../Wallet/modules/encryption");
const ZNSPartsModule = require("./zns-parts.module");
const SessionModule = require("../../Session/modules/session.module");
const jwt = require("jsonwebtoken");
const config = require("../../../Core/config");

const _assignPropertiesToZelfNameObject = (zelfNameObject, dataToEncrypt, addresses, payload) => {
	const { price, reward, priceWithoutDiscount, discount, discountType } = ZNSPartsModule.calculateZelfNamePrice(
		zelfNameObject.zelfName.split(".")[0].length,
		zelfNameObject.duration,
		payload.referralZelfName
	);

	const { eth, btc, solana, sui } = addresses;

	zelfNameObject.price = price;
	zelfNameObject.reward = reward;
	zelfNameObject.discount = discount;
	zelfNameObject.discountType = discountType;
	zelfNameObject.publicData = dataToEncrypt.publicData;
	zelfNameObject.ethAddress = eth.address;
	zelfNameObject.btcAddress = btc.address;
	zelfNameObject.solanaAddress = solana.address;
	zelfNameObject.suiAddress = sui.address;
	zelfNameObject.hasPassword = `${Boolean(payload.password)}`;

	zelfNameObject.metadata = payload.removePGP
		? dataToEncrypt.metadata
		: payload.previewZelfProof
		? {
				mnemonic: dataToEncrypt.metadata.mnemonic
					.split(" ")
					.map((word, index, array) => (index < 2 || index >= array.length - 2 ? word : "****"))
					.join(" "),
				solanaSecretKey: `${dataToEncrypt.metadata.solanaSecretKey.slice(0, 6)}****${dataToEncrypt.metadata.solanaSecretKey.slice(-6)}`,
				suiSecretKey: `${sui.secretKey.slice(0, 6)}****${sui.secretKey.slice(-6)}`,
		  }
		: undefined;
};

const _generateZelfProof = async (dataToEncrypt, zelfNameObject) => {
	zelfNameObject.zelfProof = await encrypt(dataToEncrypt);

	if (!zelfNameObject.zelfProof) throw new Error("409:Wallet_could_not_be_encrypted");

	zelfNameObject.image = await encryptQR(dataToEncrypt);
};

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

	_assignPropertiesToZelfNameObject(zelfNameObject, dataToEncrypt, { eth, btc, solana, sui }, { ...payload, password });

	await _generateZelfProof(dataToEncrypt, zelfNameObject);

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
