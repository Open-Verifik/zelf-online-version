const bip39 = require("bip39");
const bitcoin = require("bitcoinjs-lib");
const tinysecp = require("tiny-secp256k1"); // Import the secp256k1 library
const { BIP32Factory } = require("bip32"); // Use BIP32Factory
// Create BIP32 instance using the factory
const bip32 = BIP32Factory(tinysecp);

const createBTCWallet = (mnemonic) => {
	// Generate seed from mnemonic
	const seed = bip39.mnemonicToSeedSync(mnemonic);

	// Generate a root node from the seed using BIP32
	const root = bip32.fromSeed(seed);

	// Derive the first account, first external change address (m/44'/0'/0'/0/0) for Bitcoin
	const path = "m/44'/0'/0'/0/0"; // BIP44 derivation path for Bitcoin
	const account = root.derivePath(path);

	// Get the public key and generate a Bitcoin address
	const { address } = bitcoin.payments.p2pkh({
		pubkey: account.publicKey,
		network: bitcoin.networks.bitcoin, // Mainnet (for testnet, use `bitcoin.networks.testnet`)
	});

	return { address };
};

module.exports = {
	createBTCWallet,
};
