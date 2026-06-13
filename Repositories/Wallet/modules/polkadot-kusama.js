const {
	cryptoWaitReady,
	mnemonicToMiniSecret,
	sr25519PairFromSeed,
	encodeAddress,
} = require("@polkadot/util-crypto");

// Default Polkadot.js Keyring first account: BIP39 → mini secret → SR25519 (not Ledger m/44'/354'/…).
const SS58_POLKADOT = 0;
const SS58_KUSAMA = 2;

const deriveSr25519PairFromMnemonic = async (mnemonic) => {
	await cryptoWaitReady();
	const seed = mnemonicToMiniSecret(mnemonic);
	return sr25519PairFromSeed(seed);
};

const createPolkadotWallet = async (mnemonic) => {
	const pair = await deriveSr25519PairFromMnemonic(mnemonic);

	return {
		address: encodeAddress(pair.publicKey, SS58_POLKADOT),
		secretKey: Buffer.from(pair.secretKey).toString("hex"),
	};
};

const createKusamaWallet = async (mnemonic) => {
	const pair = await deriveSr25519PairFromMnemonic(mnemonic);

	return {
		address: encodeAddress(pair.publicKey, SS58_KUSAMA),
		secretKey: Buffer.from(pair.secretKey).toString("hex"),
	};
};

module.exports = {
	createPolkadotWallet,
	createKusamaWallet,
};
