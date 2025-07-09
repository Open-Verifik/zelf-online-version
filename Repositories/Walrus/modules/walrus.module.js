const { getFullnodeUrl, SuiClient } = require("@mysten/sui.js/client");
const { WalrusClient } = require("@mysten/walrus");
const { Ed25519Keypair } = require("@mysten/sui.js/keypairs/ed25519");
const fs = require("fs");
const path = require("path");
const config = require("../../../Core/config");
const axios = require("axios");

// Walrus testnet configuration
const walrusUrl = `https://walrus-testnet.mystenlabs.com`;
const explorerUrl = `https://walruscan.com/testnet/blob`;

// Initialize Sui client
const suiClient = new SuiClient({
	url: getFullnodeUrl("testnet"),
});

// Initialize Walrus client
const walrusClient = new WalrusClient({
	network: "testnet",
	suiClient,
});

const zelfNameRegistration = async (zelfProofQRCode, zelfNameObject) => {
	const { zelfProof, hasPassword, publicData } = zelfNameObject;

	try {
		// Create keypair from config
		const keypair = Ed25519Keypair.fromSecretKey(Buffer.from(config.walrus.privateKey, "hex"));

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
		};
	} catch (error) {
		console.error("Error uploading to Walrus:", error);
		throw error;
	}
};

const search = async (queryParams = {}) => {
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

module.exports = {
	zelfNameRegistration,
	search,
	walrusIDToBase64,
};
