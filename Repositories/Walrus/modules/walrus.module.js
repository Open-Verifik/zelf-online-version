const { getFullnodeUrl, SuiClient } = require("@mysten/sui/client");
const { Ed25519Keypair } = require("@mysten/sui/keypairs/ed25519");
const fs = require("fs");
const path = require("path");
const config = require("../../../Core/config");
const axios = require("axios");
const { getWalrusKeyFromMnemonic } = require("../walrus-key-generator");

// Walrus testnet configuration
const walrusUrl = `https://walrus-mainnet.mystenlabs.com`;
const explorerUrl = `https://walruscan.com/mainnet/blob`;

// Initialize clients with error handling
let suiClient = null;
let walrusClient = null;
let walrusAvailable = false;

try {
	// Initialize Sui client
	suiClient = new SuiClient({
		url: getFullnodeUrl("mainnet"),
	});

	// Try to initialize Walrus client
	const { WalrusClient } = require("@mysten/walrus");
	walrusClient = new WalrusClient({
		network: "mainnet",
		suiClient,
	});
	walrusAvailable = true;
	console.log("✅ Walrus client initialized successfully");
} catch (error) {
	console.warn("⚠️  Walrus client initialization failed:", error.message);
	console.warn("   Walrus functionality will be disabled");
	walrusAvailable = false;
}

const zelfNameRegistration = async (zelfProofQRCode, zelfNameObject) => {
	const { zelfProof, hasPassword, publicData } = zelfNameObject;

	try {
		// Check if Walrus is available
		if (!walrusAvailable) {
			return {
				skipped: true,
				reason: "Walrus client not available",
				error: "Walrus SDK initialization failed",
			};
		}

		// Check if private key is configured
		if (!config.walrus.privateKey) {
			return {
				skipped: true,
				reason: "WALRUS_PRIVATE_KEY not configured",
				error: "Please add WALRUS_PRIVATE_KEY to your .env file",
			};
		}

		// Get private key from mnemonic
		let privateKeyData;
		try {
			privateKeyData = await getWalrusKeyFromMnemonic(config.walrus.privateKey);
		} catch (error) {
			return {
				skipped: true,
				reason: "Failed to derive private key from mnemonic",
				error: error.message,
			};
		}

		// Validate and convert private key
		let privateKeyBuffer;
		try {
			const privateKeyHex = privateKeyData.privateKeyHex.replace(/^0x/, ""); // Remove 0x prefix if present

			// Check if it's a valid hex string
			if (!/^[0-9a-fA-F]+$/.test(privateKeyHex)) {
				return {
					skipped: true,
					reason: "Invalid private key format",
					error: "Private key must be a valid hex string (64 characters)",
				};
			}

			// Check length (should be 64 hex characters = 32 bytes)
			if (privateKeyHex.length !== 64) {
				return {
					skipped: true,
					reason: "Invalid private key length",
					error: `Private key must be 64 hex characters (got ${privateKeyHex.length})`,
				};
			}

			privateKeyBuffer = Buffer.from(privateKeyHex, "hex");
		} catch (error) {
			return {
				skipped: true,
				reason: "Private key conversion failed",
				error: `Failed to convert private key: ${error.message}`,
			};
		}

		// Create keypair from config
		const keypair = Ed25519Keypair.fromSecretKey(privateKeyBuffer);

		// Convert base64 string to a buffer
		const base64Data = zelfProofQRCode.replace(/^data:image\/\w+;base64,/, "");
		const buffer = Buffer.from(base64Data, "base64");
		const fileSize = buffer.length;

		// Create temporary file
		const tempFilePath = path.join(__dirname, `${zelfNameObject.zelfName}.png`);
		fs.writeFileSync(tempFilePath, buffer);

		// Prepare metadata for Sui object
		const metadata = {
			zelfProof,
			hasPassword: hasPassword || "false",
			contentType: "image/png",
			fileName: `${zelfNameObject.zelfName}.png`,
			...publicData,
		};

		// Check file size limit (100KB similar to Arweave)
		if (fileSize > 100 * 1024) {
			console.log("Skipping upload because the file size is greater than 100KB", {
				fileInKb: fileSize / 1024,
				fileInMb: fileSize / 1024 / 1024,
			});

			// Clean up temporary file
			fs.unlinkSync(tempFilePath);

			return {
				skipped: true,
				reason: "File size exceeds 100KB limit",
			};
		}

		// Upload blob to Walrus
		const blob = new Uint8Array(buffer);
		const uploadResult = await walrusClient.writeBlob({
			blob,
			deletable: false,
			epochs: 5, // Store for 5 epochs (10 days on testnet)
			signer: keypair,
		});

		// Clean up temporary file
		fs.unlinkSync(tempFilePath);

		// Create metadata object on Sui blockchain
		// This would require a custom smart contract deployment
		// For now, we'll return the blob ID and construct URLs

		return {
			blobId: uploadResult.blobId,
			url: `${walrusUrl}/${uploadResult.blobId}`,
			explorerUrl: `${explorerUrl}/${uploadResult.blobId}`,
			metadata,
			epochs: 5,
			network: "testnet",
			uploadResult,
		};
	} catch (error) {
		console.error("Error uploading to Walrus:", error);
		return {
			skipped: true,
			reason: "Upload failed",
			error: error.message,
		};
	}
};

const search = async (queryParams = {}) => {
	// Check if Walrus is available
	if (!walrusAvailable) {
		return {
			...queryParams,
			available: false,
			message: "Walrus client not available",
		};
	}

	// Walrus doesn't have built-in search functionality like Arweave
	// This would need to be implemented through Sui blockchain queries
	// or by maintaining a separate index

	if (!queryParams.key || !queryParams.value) {
		return {
			...queryParams,
			available: true,
			message: "Search functionality not yet implemented for Walrus",
		};
	}

	// TODO: Implement search functionality
	// This would require querying Sui blockchain for objects with specific metadata

	return {
		...queryParams,
		available: true,
		message: "Search functionality not yet implemented for Walrus",
	};
};

const walrusIDToBase64 = async (blobId) => {
	try {
		// Check if Walrus is available
		if (!walrusAvailable) {
			throw new Error("Walrus client not available");
		}

		const response = await axios.get(`${walrusUrl}/${blobId}`, {
			responseType: "arraybuffer",
		});

		if (response?.data) {
			const base64Image = Buffer.from(response.data).toString("base64");
			return `data:image/png;base64,${base64Image}`;
		}
	} catch (exception) {
		console.error("Error fetching from Walrus:", exception);
		return exception?.message;
	}
};

// Helper function to check if Walrus is available
const isWalrusAvailable = () => {
	return walrusAvailable;
};

module.exports = {
	zelfNameRegistration,
	search,
	walrusIDToBase64,
	isWalrusAvailable,
};
