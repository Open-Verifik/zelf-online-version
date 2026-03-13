const { ethers } = require("ethers");

const createEthWallet = (mnemonic) => {
	try {
		const wallet = ethers.Wallet.fromPhrase(mnemonic);

		return {
			address: wallet.address,
			privateKey: wallet.privateKey,
		};
	} catch (exception) {
		const error = new Error("invalid_seed_phrase");

		error.status = 409;

		throw error;
	}
};

module.exports = {
	createEthWallet,
};
