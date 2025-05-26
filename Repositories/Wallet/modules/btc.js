const bip39 = require("bip39");
const bitcoin = require("bitcoinjs-lib");
const tinysecp = require("tiny-secp256k1");
const { BIP32Factory } = require("bip32");

const createBTCWallet = (mnemonic) => {
	const path = `m/84'/0'/0'/0/0`;
	const network = bitcoin.networks.bitcoin;

	const seedBytes = bip39.mnemonicToSeedSync(mnemonic);
	const bip32 = BIP32Factory(tinysecp);
	const root = bip32.fromSeed(seedBytes, network);
	const account = root.derivePath(path);

	const { address } = bitcoin.payments.p2wpkh({
		pubkey: account.publicKey,
		network,
	});

	return { address };
};

module.exports = {
	createBTCWallet,
};
