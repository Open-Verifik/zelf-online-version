const StellarHDWallet = require("stellar-hd-wallet").default;

const createStellarWallet = (mnemonic) => {
	try {
		const wallet = StellarHDWallet.fromMnemonic(mnemonic);

		return {
			address: wallet.getPublicKey(0),
			secretKey: wallet.getSecret(0),
		};
	} catch (exception) {
		const error = new Error("invalid_seed_phrase");

		error.status = 409;

		throw error;
	}
};

module.exports = {
	createStellarWallet,
};
