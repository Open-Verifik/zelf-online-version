const { Ed25519Keypair } = require("@mysten/sui.js/keypairs/ed25519");
// const { mnemonicToSeed } = require("@mysten/sui.js/cryptography");

// Function to generate SUI wallet from mnemonic
async function generateSuiWalletFromMnemonic(mnemonic) {
	try {
		// Convert mnemonic to seed
		// const seed = await mnemonicToSeed(mnemonic);

		// Generate keypair from seed
		const keypair = Ed25519Keypair.deriveKeypair(mnemonic);

		// Get public key
		const publicKey = keypair.getPublicKey();

		// Get SUI address (starts with 0x)
		const address = publicKey.toSuiAddress();

		// Get private key (in hex format)
		// const privateKey = toHEX(keypair.getSecretKey());

		return {
			address,
			secretKey: keypair.getSecretKey(),
			// privateKey: `0x${privateKey}`,
		};
	} catch (error) {
		console.error("Error generating wallet:", error);
		throw error;
	}
}

module.exports = {
	generateSuiWalletFromMnemonic,
};
