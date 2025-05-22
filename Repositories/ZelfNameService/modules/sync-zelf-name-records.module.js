const { createBTCWallet } = require("../../Wallet/modules/btc");

const initTagUpdates = async (zelfNameObject, mnemonic) => {
	let sui = {};
	let btc = {};

	if (!zelfNameObject.publicData.suiAddress) {
		sui = await generateSuiWalletFromMnemonic(mnemonic);

		zelfNameObject.publicData.suiAddress = sui.address;
	}

	if (!zelfNameObject.publicData.btcAddress.startsWith("bc1")) {
		btc = createBTCWallet(mnemonic).address;

		zelfNameObject.publicData.btcAddress = btc.address;
	}

	const { encryptedMessage, privateKey } = await SessionModule.walletEncrypt(
		{ mnemonic, zkProof, solanaSecretKey, suiSecretKey: sui.secretKey },
		zelfNameObject.publicData.ethAddress,
		password
	);

	return {
		encryptedMessage,
		privateKey,
		requiresUpdate: Boolean(sui?.address || btc?.address),
	};
};

const updateTags = async (zelfNameObject) => {};

module.exports = {
	initTagUpdates,
	updateTags,
};
