const { Ed25519Keypair } = require("@mysten/sui/keypairs/ed25519");
const { generateSuiWalletFromMnemonic } = require("../Wallet/modules/sui");

// Helper function to convert Uint8Array to hex string
function toHex(bytes) {
	return Array.from(bytes, (byte) => byte.toString(16).padStart(2, "0")).join("");
}

/**
 * Generate a new Ed25519 keypair for Walrus
 * @returns {Object} Object containing address, privateKeyHex, and mnemonic
 */
function generateNewWalrusKeypair() {
	try {
		// Generate a new keypair
		const keypair = new Ed25519Keypair();

		// Get the address
		const address = keypair.toSuiAddress();

		// Get the private key in hex format
		const secretKey = keypair.getSecretKey();
		const privateKeyHex = toHex(secretKey);

		// Export the keypair to get the mnemonic
		const exported = keypair.export();

		return {
			address,
			privateKeyHex,
			mnemonic: exported.privateKey, // This is actually the mnemonic phrase
			keypair,
		};
	} catch (error) {
		console.error("Error generating new Walrus keypair:", error);
		throw error;
	}
}

/**
 * Get Walrus private key from existing mnemonic
 * @param {string} mnemonic - The mnemonic phrase
 * @returns {Object} Object containing address and privateKeyHex
 */
async function getWalrusKeyFromMnemonic(mnemonic) {
	try {
		const keypair = Ed25519Keypair.deriveKeypair(mnemonic);
		// The raw secret key is the first 32 bytes of keypair.keypair.secretKey
		const secretKeyBytes = keypair.keypair.secretKey.slice(0, 32); // Uint8Array(32)
		const privateKeyHex = Buffer.from(secretKeyBytes).toString("hex");
		return {
			address: keypair.toSuiAddress(),
			privateKeyHex,
			secretKey: secretKeyBytes,
		};
	} catch (error) {
		console.error("Error getting Walrus key from mnemonic:", error);
		throw error;
	}
}

/**
 * Validate if a private key is in the correct format for Walrus
 * @param {string} privateKeyHex - The private key in hex format
 * @returns {boolean} True if valid, false otherwise
 */
function validateWalrusPrivateKey(privateKeyHex) {
	try {
		// Remove 0x prefix if present
		const cleanKey = privateKeyHex.replace(/^0x/, "");

		// Check if it's a valid hex string
		if (!/^[0-9a-fA-F]+$/.test(cleanKey)) {
			return false;
		}

		// Check if it's the correct length for Ed25519 (64 bytes = 128 hex characters)
		if (cleanKey.length !== 64) {
			return false;
		}

		// Try to create a keypair from it
		const keypair = Ed25519Keypair.fromSecretKey(Buffer.from(cleanKey, "hex"));

		// If we get here, it's valid
		return true;
	} catch (error) {
		return false;
	}
}

/**
 * Get wallet info from private key
 * @param {string} privateKeyHex - The private key in hex format
 * @returns {Object} Object containing address and validation status
 */
function getWalletInfoFromPrivateKey(privateKeyHex) {
	try {
		const cleanKey = privateKeyHex.replace(/^0x/, "");
		const keypair = Ed25519Keypair.fromSecretKey(Buffer.from(cleanKey, "hex"));
		const address = keypair.toSuiAddress();

		return {
			address,
			isValid: true,
			keypair,
		};
	} catch (error) {
		return {
			address: null,
			isValid: false,
			error: error.message,
		};
	}
}

/**
 * Convert a private key to the correct format for Walrus
 * @param {string} privateKey - The private key in any format
 * @returns {Object} Object with validation and conversion results
 */
function convertPrivateKeyForWalrus(privateKey) {
	try {
		// Remove 0x prefix if present
		const cleanKey = privateKey.replace(/^0x/, "");

		// Check if it's already a valid hex string
		if (/^[0-9a-fA-F]{64}$/.test(cleanKey)) {
			return {
				success: true,
				privateKeyHex: cleanKey,
				format: "hex",
				message: "Private key is already in correct format",
			};
		}

		// Try to decode as base64
		try {
			const buffer = Buffer.from(cleanKey, "base64");
			if (buffer.length === 32) {
				const hexKey = buffer.toString("hex");
				return {
					success: true,
					privateKeyHex: hexKey,
					format: "base64",
					message: "Converted from base64 to hex",
				};
			}
		} catch (e) {
			// Not base64, continue
		}

		// If we get here, the format is not recognized
		return {
			success: false,
			error: "Unrecognized private key format. Expected 64-character hex string or 32-byte base64",
		};
	} catch (error) {
		return {
			success: false,
			error: error.message,
		};
	}
}

// Example usage and testing
async function exampleUsage() {
	console.log("🔑 Walrus Key Generator Examples");
	console.log("================================");

	// Example 1: Generate a new keypair
	console.log("\n1️⃣ Generating new keypair...");
	const newKeypair = generateNewWalrusKeypair();
	console.log("Address:", newKeypair.address);
	console.log("Private Key (Hex):", newKeypair.privateKeyHex);
	console.log("Mnemonic:", newKeypair.mnemonic);

	// Example 2: Get key from mnemonic
	console.log("\n2️⃣ Getting key from mnemonic...");
	const testMnemonic = "test test test test test test test test test test test junk";
	const fromMnemonic = await getWalrusKeyFromMnemonic(testMnemonic);
	console.log("Address:", fromMnemonic.address);
	console.log("Private Key (Hex):", fromMnemonic.privateKeyHex);

	// Example 3: Validate private key
	console.log("\n3️⃣ Validating private key...");
	const isValid = validateWalrusPrivateKey(fromMnemonic.privateKeyHex);
	console.log("Is valid:", isValid);

	// Example 4: Get wallet info
	console.log("\n4️⃣ Getting wallet info...");
	const walletInfo = getWalletInfoFromPrivateKey(fromMnemonic.privateKeyHex);
	console.log("Wallet info:", walletInfo);

	// Example 5: Convert private key
	console.log("\n5️⃣ Converting private key...");
	const conversion = convertPrivateKeyForWalrus(fromMnemonic.privateKeyHex);
	console.log("Conversion result:", conversion);

	console.log("\n✅ Examples completed!");
}

// Run examples if this file is executed directly
if (require.main === module) {
	exampleUsage().catch(console.error);
}

module.exports = {
	generateNewWalrusKeypair,
	getWalrusKeyFromMnemonic,
	validateWalrusPrivateKey,
	getWalletInfoFromPrivateKey,
	convertPrivateKeyForWalrus,
	toHex,
	exampleUsage,
};
