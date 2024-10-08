const { ethers } = require("ethers");

const createEthWallet = (mnemonic) => {
	const wallet = ethers.Wallet.fromPhrase(mnemonic);

	// Return the wallet and the mnemonic
	return {
		address: wallet.address,
		privateKey: wallet.privateKey,
		publicKey: wallet.publicKey,
		mnemonic: wallet.mnemonic,
	};
};

module.exports = {
	createEthWallet,
};
