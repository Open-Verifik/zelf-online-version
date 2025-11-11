const { getFullnodeUrl, SuiClient } = require("@mysten/sui/client");
const { Ed25519Keypair } = require("@mysten/sui/keypairs/ed25519");
const fs = require("fs");
const path = require("path");
const config = require("../../../Core/config");
const axios = require("axios");
const { getWalrusKeyFromMnemonic } = require("../walrus-key-generator");
// Try to initialize Walrus client for mainnet
const { WalrusClient } = require("@mysten/walrus");
console.log("🔍 DEBUG: WalrusClient imported successfully");

// Walrus mainnet configuration
const WALRUS_NETWORK = "mainnet"; // Make this configurable

// Walrus URLs for blob access
// Note: Actual blob retrieval uses the Walrus SDK (walrusClient.readBlob())
// These URLs are for reference/display purposes and may not be directly accessible via HTTP
const walrusUrls = {
	// Primary direct blob access URL (based on official documentation)
	primary: `https://walrus-mainnet.mystenlabs.com`,
	// Alternative URLs (may not be active)
	alternatives: [],
	// Fallback URL (if needed)
	fallback: `https://walrus-mainnet.mystenlabs.com`,
};

const explorerUrl = `https://walruscan.com/mainnet/blob`;

// Initialize clients with error handling
let suiClient = null;
let walrusClient = null;
let walrusAvailable = false;

try {
	// Initialize Sui client for mainnet
	console.log("🔍 DEBUG: Starting Walrus client initialization...");
	console.log("🔍 DEBUG: Current working directory:", process.cwd());
	console.log("🔍 DEBUG: Module file path:", __filename);

	suiClient = new SuiClient({
		url: getFullnodeUrl(WALRUS_NETWORK),
	});
	console.log("🔍 DEBUG: Sui client created successfully");

	// Simple Walrus client initialization
	console.log("🔍 DEBUG: Creating WalrusClient...");
	walrusClient = new WalrusClient({
		network: WALRUS_NETWORK,
		suiClient,
	});
	console.log("🔍 DEBUG: WalrusClient created successfully");

	walrusAvailable = true;
	console.log(`✅ Walrus client initialized successfully on ${WALRUS_NETWORK}`);
} catch (error) {
	console.warn("⚠️  Walrus client initialization failed:", error.message);
	console.warn("   Error type:", error.constructor.name);
	console.warn("   Error stack:", error.stack);
	console.warn("   Walrus functionality will be disabled");
	console.warn("   This might be because mainnet SDK support is still being finalized");
	walrusAvailable = false;
}

/**
 * Get and validate Walrus keypair from configuration
 * This function handles all key derivation, validation, and keypair creation
 * @returns {Promise<{success: boolean, keypair?: Ed25519Keypair, error?: string, reason?: string}>}
 */
const getWalrusKeypair = async () => {
	try {
		// Check if Walrus is available
		if (!walrusAvailable) {
			return {
				success: false,
				skipped: true,
				reason: "Walrus client not available",
				error: "Walrus SDK initialization failed",
			};
		}

		// Check if private key is configured
		if (!config.walrus.privateKey) {
			return {
				success: false,
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
				success: false,
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
					success: false,
					skipped: true,
					reason: "Invalid private key format",
					error: "Private key must be a valid hex string (64 characters)",
				};
			}

			// Check length (should be 64 hex characters = 32 bytes)
			if (privateKeyHex.length !== 64) {
				return {
					success: false,
					skipped: true,
					reason: "Invalid private key length",
					error: `Private key must be 64 hex characters (got ${privateKeyHex.length})`,
				};
			}

			privateKeyBuffer = Buffer.from(privateKeyHex, "hex");
		} catch (error) {
			return {
				success: false,
				skipped: true,
				reason: "Private key conversion failed",
				error: `Failed to convert private key: ${error.message}`,
			};
		}

		// Create keypair from config
		const keypair = Ed25519Keypair.fromSecretKey(privateKeyBuffer);

		return {
			success: true,
			keypair,
		};
	} catch (error) {
		return {
			success: false,
			skipped: true,
			reason: "Keypair creation failed",
			error: error.message,
		};
	}
};

/**
 * Prepares a blob from base64 QR code for Walrus upload
 * Handles base64 conversion, size validation, and blob creation
 * @param {string} zelfProofQRCode - Base64 encoded QR code image (with or without data URL prefix)
 * @param {string} zelfProof - The zelfProof string
 * @param {object} publicData - Public data to include in metadata
 * @param {string} fileName - Name for the file (e.g., "tagName.png")
 * @param {object} additionalMetadata - Optional additional metadata fields (e.g., hasPassword)
 * @returns {Promise<{success: boolean, blob?: Uint8Array, buffer?: Buffer, fileSize?: number, metadata?: object, skipped?: boolean, reason?: string}>}
 */
const prepareBlobForUpload = (zelfProofQRCode, zelfProof, publicData, fileName, additionalMetadata = {}) => {
	try {
		// Convert base64 string to a buffer
		const base64Data = zelfProofQRCode.replace(/^data:image\/\w+;base64,/, "");
		const buffer = Buffer.from(base64Data, "base64");
		const fileSize = buffer.length;

		// Prepare metadata for Sui object
		const metadata = {
			zelfProof,
			contentType: "image/png",
			fileName: fileName,
			...additionalMetadata,
			...publicData,
		};

		// Check file size limit (100KB similar to Arweave)
		if (fileSize > 100 * 1024) {
			console.log("Skipping upload because the file size is greater than 100KB", {
				fileInKb: fileSize / 1024,
				fileInMb: fileSize / 1024 / 1024,
			});

			return {
				success: false,
				skipped: true,
				reason: "File size exceeds 100KB limit",
			};
		}

		// Create blob from buffer (using buffer directly, no temp file needed)
		const blob = new Uint8Array(buffer);

		return {
			success: true,
			blob,
			buffer,
			fileSize,
			metadata,
		};
	} catch (error) {
		return {
			success: false,
			skipped: true,
			reason: "Failed to prepare blob",
			error: error.message,
		};
	}
};

/**
 * Registers a zelf name by uploading the QR code image to Walrus
 * @param {string} zelfProofQRCode - Base64 encoded QR code image
 * @param {object} zelfNameObject - Object containing zelf name details
 * @returns {object} Result object with blobId, publicUrl, explorerUrl, and metadata
 *
 * Usage:
 * const result = await zelfNameRegistration(qrCodeBase64, zelfNameObj);
 * if (result.success) {
 *   console.log('Public URL:', result.publicUrl); // Direct blob access
 *   console.log('Explorer URL:', result.explorerUrl); // Walrus explorer
 *   console.log('Blob ID:', result.blobId); // For database storage
 * }
 */
const zelfNameRegistration = async (zelfProofQRCode, zelfNameObject) => {
	const { zelfProof, hasPassword, publicData } = zelfNameObject;

	const zelfName = publicData.zelfName;

	try {
		// Get Walrus keypair using the extracted function
		const keypairResult = await getWalrusKeypair();

		if (!keypairResult.success) return keypairResult;

		const keypair = keypairResult.keypair;

		// Prepare blob for upload using the generic function
		const blobResult = prepareBlobForUpload(zelfProofQRCode, zelfProof, publicData, `${zelfName}.png`, { hasPassword: hasPassword || "false" });

		if (!blobResult.success) {
			return {
				skipped: true,
				reason: blobResult.reason,
				error: blobResult.error,
			};
		}

		const { blob, fileSize, metadata } = blobResult;

		console.log(`📤 Uploading ${zelfName}.png to Walrus (${fileSize} bytes)`);

		const uploadResult = await walrusClient.writeBlob({
			blob,
			deletable: false,
			epochs: 5, // Store for 5 epochs
			signer: keypair,
		});

		console.log(`✅ Successfully uploaded to Walrus:`, {
			blobId: uploadResult.blobId,
			sizeBytes: fileSize,
			zelfName: zelfName,
		});

		return {
			success: true,
			blobId: uploadResult.blobId,
			publicUrl: getPublicBlobUrl(uploadResult.blobId),
			explorerUrl: getExplorerBlobUrl(uploadResult.blobId),
			metadata: {
				...metadata,
				uploadTimestamp: new Date().toISOString(),
				sizeBytes: fileSize,
				network: WALRUS_NETWORK,
			},
			storage: {
				epochs: 5,
				network: WALRUS_NETWORK,
				deletable: false,
			},
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

const tagRegistration = async (zelfProofQRCode, tagObject, domainConfig) => {
	const { zelfProof, hasPassword, publicData } = tagObject;

	const tagName = publicData[domainConfig.getTagKey()];

	try {
		// Get Walrus keypair using the extracted function
		const keypairResult = await getWalrusKeypair();

		if (!keypairResult.success) return keypairResult;

		const keypair = keypairResult.keypair;

		// Prepare blob for upload using the generic function
		const blobResult = prepareBlobForUpload(zelfProofQRCode, zelfProof, publicData, `${tagName}.png`);

		if (!blobResult.success) {
			return {
				skipped: true,
				reason: blobResult.reason,
				error: blobResult.error,
			};
		}

		const { blob, fileSize, metadata } = blobResult;

		console.log(`📤 Uploading ${tagName}.png to Walrus (${fileSize} bytes)`);

		const uploadResult = await walrusClient.writeBlob({
			blob,
			deletable: false,
			epochs: 5, // Store for 5 epochs
			signer: keypair,
		});

		console.log(`✅ Successfully uploaded to Walrus:`, {
			blobId: uploadResult.blobId,
			sizeBytes: fileSize,
			tagName: tagName,
		});

		return {
			success: true,
			blobId: uploadResult.blobId,
			publicUrl: getPublicBlobUrl(uploadResult.blobId),
			explorerUrl: getExplorerBlobUrl(uploadResult.blobId),
			metadata: {
				...metadata,
				uploadTimestamp: new Date().toISOString(),
				sizeBytes: fileSize,
				network: WALRUS_NETWORK,
			},
			storage: {
				epochs: 5,
				network: WALRUS_NETWORK,
				deletable: false,
			},
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

/**
 * Registers a ZOTP by uploading the QR code image to Walrus
 * @param {string} zelfProofQRCode - Base64 encoded QR code image
 * @param {object} zotpObject - Object containing ZOTP details
 * @returns {object} Result object with blobId, publicUrl, explorerUrl, and metadata
 */
const zelfKeyStorage = async (zelfProofQRCode, zotpObject) => {
	const { zelfProof, publicData } = zotpObject;
	const { category = "zotp" } = publicData || {};

	// Generate a unique identifier for the ZOTP
	const zotpIdentifier = publicData.username || `${category}_${Date.now()}`;
	const fileName = `${zotpIdentifier}_${category}.png`;

	try {
		// Get Walrus keypair using the extracted function
		const keypairResult = await getWalrusKeypair();

		if (!keypairResult.success) return keypairResult;

		const keypair = keypairResult.keypair;

		// Prepare blob for upload using the generic function
		const blobResult = prepareBlobForUpload(zelfProofQRCode, zelfProof, publicData, fileName, { type: "zotp" });

		if (!blobResult.success) {
			return {
				skipped: true,
				reason: blobResult.reason,
				error: blobResult.error,
			};
		}

		const { blob, fileSize, metadata } = blobResult;

		console.log(`📤 Uploading ${fileName} to Walrus (${fileSize} bytes)`);

		const uploadResult = await walrusClient.writeBlob({
			blob,
			deletable: false,
			epochs: 5, // Store for 5 epochs
			signer: keypair,
		});

		console.log(`✅ Successfully uploaded ZOTP to Walrus:`, {
			blobId: uploadResult.blobId,
			sizeBytes: fileSize,
			zotpIdentifier: zotpIdentifier,
		});

		return {
			success: true,
			blobId: uploadResult.blobId,
			publicUrl: getPublicBlobUrl(uploadResult.blobId),
			explorerUrl: getExplorerBlobUrl(uploadResult.blobId),
			metadata: {
				...metadata,
				uploadTimestamp: new Date().toISOString(),
				sizeBytes: fileSize,
				network: WALRUS_NETWORK,
			},
			storage: {
				epochs: 5,
				network: WALRUS_NETWORK,
				deletable: false,
			},
			uploadResult,
		};
	} catch (error) {
		console.error("Error uploading ZOTP to Walrus:", error);
		return {
			skipped: true,
			reason: "Upload failed",
			error: error.message,
		};
	}
};

/**
 * Helper function to prepare image data for frontend rendering
 * @param {string} blobId - The Walrus blob ID
 * @returns {object} Object containing image data and metadata for frontend use
 */
const prepareImageForFrontend = async (blobId) => {
	try {
		console.log(`🎨 Preparing image for frontend: ${blobId}`);

		// Get the base64 data URL using robust fetching
		const dataUrl = await walrusIDToBase64(blobId);

		// Get all available URLs
		const allUrls = getAllBlobUrls(blobId);
		const explorerUrl = getExplorerBlobUrl(blobId);

		// Get image size info if possible
		const sizeInfo = await getImageSizeInfo(dataUrl);

		return {
			success: true,
			blobId,
			dataUrl, // Use this directly in <img src="{dataUrl}" />
			publicUrl: allUrls.primary, // Primary URL for direct access
			allUrls, // All available URLs for fallback
			explorerUrl, // For "View on Walrus" links
			...sizeInfo,
			network: WALRUS_NETWORK,
			retrievedAt: new Date().toISOString(),
		};
	} catch (error) {
		console.error(`❌ Failed to prepare image for frontend: ${blobId}`, error);

		// Still provide URLs even if image fetch failed
		const allUrls = getAllBlobUrls(blobId);

		return {
			success: false,
			blobId,
			error: error.message,
			fallback: {
				publicUrl: allUrls.primary,
				allUrls,
				explorerUrl: getExplorerBlobUrl(blobId),
				network: WALRUS_NETWORK,
				note: "Image fetch failed, but URLs are still available for direct access",
			},
		};
	}
};

/**
 * Helper function to get basic image information from data URL
 * @param {string} dataUrl - Base64 data URL
 * @returns {object} Basic image information
 */
const getImageSizeInfo = async (dataUrl) => {
	try {
		// Calculate approximate size
		const base64Data = dataUrl.split(",")[1];
		const sizeInBytes = Math.round((base64Data.length * 3) / 4);

		// Extract content type
		const contentTypeMatch = dataUrl.match(/data:([^;]+);base64,/);
		const contentType = contentTypeMatch ? contentTypeMatch[1] : "image/png";

		return {
			sizeInBytes,
			sizeInKB: Math.round(sizeInBytes / 1024),
			contentType,
			format: contentType.split("/")[1]?.toLowerCase() || "png",
		};
	} catch (error) {
		console.warn("Could not extract image info:", error.message);
		return {
			sizeInBytes: 0,
			sizeInKB: 0,
			contentType: "image/png",
			format: "png",
		};
	}
};

/**
 * Save a Walrus blob as a local file
 * @param {string} blobId - The Walrus blob ID
 * @param {string} outputPath - Optional custom output path (defaults to retrieved-{shortId}.png)
 * @returns {object} Result object with file path and metadata
 */
const saveBlobAsFile = async (blobId, outputPath = null) => {
	try {
		console.log(`💾 Saving Walrus blob as file: ${blobId}`);

		// Get the base64 data from Walrus
		const base64Data = await walrusIDToBase64(blobId);

		// Extract just the base64 content (remove data:image/png;base64, prefix)
		const base64Content = base64Data.split(",")[1];

		// Convert to buffer
		const buffer = Buffer.from(base64Content, "base64");

		// Generate filename if not provided
		const filename = outputPath || `retrieved-${blobId.substring(0, 8)}.png`;

		// Save to file
		fs.writeFileSync(filename, buffer);

		// Get file stats
		const stats = fs.statSync(filename);

		console.log(`✅ Blob saved successfully as: ${filename}`);

		return {
			success: true,
			blobId,
			filePath: filename,
			absolutePath: path.resolve(filename),
			fileSize: stats.size,
			fileSizeKB: Math.round(stats.size / 1024),
			savedAt: new Date().toISOString(),
			// URLs for reference
			publicUrl: getPublicBlobUrl(blobId),
			explorerUrl: getExplorerBlobUrl(blobId),
		};
	} catch (error) {
		console.error(`❌ Failed to save blob as file: ${blobId}`, error);
		return {
			success: false,
			blobId,
			error: error.message,
			filePath: null,
		};
	}
};

// Removed fetchBlobWithFallback - only Walrus SDK readBlob works

/**
 * Simplified blob retrieval - only uses what actually works: Walrus SDK readBlob
 * @param {string} blobId - The Walrus blob ID
 * @returns {Promise<string>} Base64 data URL
 */
const walrusIDToBase64WithWorkaround = async (blobId) => {
	const startTime = Date.now();

	try {
		console.log(`📥 Fetching blob via Walrus SDK: ${blobId}`);

		// Only strategy that works: Walrus SDK readBlob
		if (walrusAvailable && walrusClient) {
			const blobData = await walrusClient.readBlob({ blobId });

			if (blobData && blobData.length > 0) {
				const duration = Date.now() - startTime;
				console.log(`✅ Success: ${blobData.length} bytes in ${duration}ms`);

				const base64Image = Buffer.from(blobData).toString("base64");
				return `data:image/png;base64,${base64Image}`;
			}
		}

		throw new Error("Walrus SDK not available or returned empty data");
	} catch (error) {
		const duration = Date.now() - startTime;
		console.error(`❌ Failed to fetch blob ${blobId}: ${error.message} (${duration}ms)`);
		throw error;
	}
};

/**
 * Retrieves a blob from Walrus by ID and converts it to base64 data URL
 * Uses only the Walrus SDK readBlob - the only method that actually works
 * @param {string} blobId - The Walrus blob ID
 * @returns {string} Base64 data URL that can be used directly in HTML img src
 */
const walrusIDToBase64 = async (blobId) => {
	try {
		// Check if Walrus is available
		if (!walrusAvailable) {
			throw new Error("Walrus client not available");
		}

		// Validate blobId format
		if (!blobId || typeof blobId !== "string") {
			throw new Error("Invalid blobId provided");
		}

		// Use the simplified function that only does what works
		return await walrusIDToBase64WithWorkaround(blobId);
	} catch (error) {
		console.error("❌ Error fetching from Walrus:", {
			blobId,
			error: error.message,
		});

		throw new Error(`Failed to fetch blob ${blobId}: ${error.message}`);
	}
};

// Helper function to check if Walrus is available
const isWalrusAvailable = () => {
	return walrusAvailable;
};

// Helper function to get public URL for a blob
// Note: This URL is for reference/display. Actual retrieval uses walrusClient.readBlob()
const getPublicBlobUrl = (blobId) => {
	if (!blobId) {
		throw new Error("blobId is required");
	}
	// Return direct blob URL format (based on official Walrus documentation)
	return `${walrusUrls.primary}/${blobId}`;
};

// Helper function to get all available URLs for a blob
// Note: These URLs are for reference/display. Actual retrieval uses walrusClient.readBlob()
const getAllBlobUrls = (blobId) => {
	if (!blobId) throw new Error("blobId is required");

	return {
		primary: `${walrusUrls.primary}/${blobId}`,
		alternatives: walrusUrls.alternatives.map((url) => `${url}/${blobId}`),
		fallback: `${walrusUrls.fallback}/${blobId}`,
	};
};

// Helper function to get explorer URL for a blob
const getExplorerBlobUrl = (blobId) => {
	if (!blobId) throw new Error("blobId is required");

	return `${explorerUrl}/${blobId}`;
};

// Helper function to get Sui explorer URL for Walrus coordination objects
const getSuiExplorerUrl = (objectId) => {
	if (!objectId) throw new Error("objectId is required");

	return `https://suiscan.xyz/mainnet/object/${objectId}`;
};

// Helper function to get alternative Sui explorer URL
const getAlternativeSuiExplorerUrl = (objectId) => {
	if (!objectId) throw new Error("objectId is required");

	return `https://suiexplorer.com/object/${objectId}`;
};

// Helper function to determine if an ID is a Walrus blob ID or Sui object ID
const identifyIdType = (id) => {
	if (!id || typeof id !== "string") {
		return { type: "invalid", reason: "ID must be a non-empty string" };
	}

	// Sui object IDs start with 0x and are 64 characters long (including 0x)
	if (id.startsWith("0x") && id.length === 66) {
		return {
			type: "sui_object",
			id: id,
			walruscanUrl: null,
			suiscanUrl: getSuiExplorerUrl(id),
			suiexplorerUrl: getAlternativeSuiExplorerUrl(id),
		};
	}

	// Walrus blob IDs are typically different format (base58 or similar)
	if (!id.startsWith("0x") && id.length > 20) {
		return {
			type: "walrus_blob",
			id: id,
			walruscanUrl: getExplorerBlobUrl(id),
			publicUrl: getPublicBlobUrl(id),
			suiscanUrl: null,
		};
	}

	return {
		type: "unknown",
		reason: "ID format not recognized as either Walrus blob or Sui object",
		id: id,
	};
};

// Enhanced function to get all relevant URLs for any ID type
const getExplorerUrls = (id) => {
	const idInfo = identifyIdType(id);

	return {
		...idInfo,
		official: {
			walrus:
				idInfo.type === "walrus_blob"
					? {
							explorer: idInfo.walruscanUrl,
							publicAccess: idInfo.publicUrl,
					  }
					: null,
			sui:
				idInfo.type === "sui_object"
					? {
							suiscan: idInfo.suiscanUrl,
							suiexplorer: idInfo.suiexplorerUrl,
					  }
					: null,
		},
	};
};

// Simple connection test function
const testConnection = async () => {
	try {
		// Test if the module is properly loaded
		if (!walrusClient) {
			return { success: false, error: "Walrus client not initialized", available: false };
		}

		// Test basic availability check
		const available = isWalrusAvailable();

		// Test a simple network request to check connectivity (but don't fail if it's down)
		let networkStatus = "unknown";
		try {
			const testUrl = walrusUrls.primary;
			const response = await axios.get(testUrl, { timeout: 5000 });
			networkStatus = response.status === 200 ? "connected" : "partial";
		} catch (networkError) {
			networkStatus = "unavailable";
			// Don't throw - this is expected while mainnet is deploying
		}

		return {
			success: true, // Consider it successful if client is initialized
			available: available,
			networkStatus: networkStatus,
			clientInitialized: !!walrusClient,
			timestamp: new Date().toISOString(),
		};
	} catch (error) {
		return {
			success: false,
			error: error.message,
			available: isWalrusAvailable(),
			clientInitialized: !!walrusClient,
			timestamp: new Date().toISOString(),
		};
	}
};

module.exports = {
	zelfNameRegistration,
	tagRegistration,
	zelfKeyStorage,
	getWalrusKeypair,
	prepareBlobForUpload,
	walrusIDToBase64,
	walrusIDToBase64WithWorkaround,
	isWalrusAvailable,
	getPublicBlobUrl,
	getAllBlobUrls,
	getExplorerBlobUrl,
	getSuiExplorerUrl,
	getAlternativeSuiExplorerUrl,
	prepareImageForFrontend,
	getImageSizeInfo,
	saveBlobAsFile,
	getExplorerUrls,
	identifyIdType,
	testConnection,
	// Configuration for debugging
	walrusUrls,
	WALRUS_NETWORK,
};
