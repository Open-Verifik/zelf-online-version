const { Ed25519Keypair } = require("@mysten/sui/keypairs/ed25519");
// const { mnemonicToSeed } = require("@mysten/sui/cryptography");

// Helper function to convert Uint8Array to hex string
function toHex(bytes) {
	return Buffer.from(bytes).toString("hex");
}

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

		// Get private key (in hex format) - needed for Walrus
		const secretKey = keypair.getSecretKey();
		const privateKeyHex = toHex(secretKey);

		return {
			address,
			secretKey: secretKey,
			privateKeyHex: privateKeyHex, // Hex format for Walrus compatibility
		};
	} catch (error) {
		console.error("Error generating wallet:", error);
		throw error;
	}
}

module.exports = {
	generateSuiWalletFromMnemonic,
	toHex,
};
