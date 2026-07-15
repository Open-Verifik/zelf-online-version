const bip39 = require("bip39");
const { derivePath } = require("ed25519-hd-key");
const { keyPairFromSeed } = require("@ton/crypto");
const { WalletContractV5R1 } = require("@ton/ton");

/** BIP44 coin type for TON (SLIP-0044). Trust Wallet / Ledger convention. */
const TON_DERIVATION_PATH = "m/44'/607'/0'";

/**
 * Derive a TON V5R1 wallet from a standard BIP39 mnemonic.
 * @param {string} mnemonic
 * @returns {Promise<{ address: string, publicKey: string, derivationPath: string }>}
 */
async function createTonWallet(mnemonic) {
	const normalized = String(mnemonic || "").trim();
	if (!normalized) {
		throw new Error("409:wallet_cannot_be_generated_invalid_mnemonic");
	}

	const seed = await bip39.mnemonicToSeed(normalized);
	const derived = derivePath(TON_DERIVATION_PATH, seed.toString("hex")).key;
	const keyPair = keyPairFromSeed(derived.slice(0, 32));
	const wallet = WalletContractV5R1.create({ workchain: 0, publicKey: keyPair.publicKey });

	return {
		address: wallet.address.toString({ bounceable: true, urlSafe: true }),
		publicKey: keyPair.publicKey.toString("hex"),
		derivationPath: TON_DERIVATION_PATH,
		walletVersion: "v5r1",
	};
}

module.exports = {
	createTonWallet,
	TON_DERIVATION_PATH,
};
