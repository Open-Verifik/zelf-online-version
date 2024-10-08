const { derivePath } = require("ed25519-hd-key");
const { Keypair } = require("@solana/web3.js");
const bip39 = require("bip39");

const createSolanaWallet = async (mnemonic) => {
	const seed = await bip39.mnemonicToSeed(mnemonic);

	const derivedSeed = derivePath("m/44'/501'/0'/0'", seed.toString("hex")).key;
	const keypair = Keypair.fromSeed(derivedSeed.slice(0, 32));

	return {
		address: keypair.publicKey.toBase58(),
	};
};

module.exports = {
	createSolanaWallet,
};
