/**
 * ZelfKey Module - Password Manager functionality similar to LastPass
 * Standalone version without external dependencies
 * @author Miguel Trevino <miguel@zelf.world>
 */

const TagsModule = require("../../Tags/modules/tags.module");
const TagsPartsModule = require("../../Tags/modules/tags-parts.module");
const ZelfKeyIPFSModule = require("./zelf-key-ipfs.module");
const ZelfProofModule = require("../../ZelfProof/modules/zelf-proof.module");
const WalrusModule = require("../../Walrus/modules/walrus.module");
const IPFS = require("../../../Core/ipfs");
const QRZelfProofExtractor = require("../../Tags/modules/qr-zelfproof-extractor.module");

const createMetadataAndPublicData = async (type, data, authToken) => {
	const identifier = authToken.tagName || authToken.identifier;

	const fullTagName = `${identifier}${authToken.domain ? "." + authToken.domain : ""}`;

	const typePayload = {
		metadata: {},
		publicData: {},
		fullTagName,
	};

	switch (type) {
		case "zotp":
			typePayload.metadata = {
				username: `${data.username}`,
				setupKey: `${data.setupKey}`,
			};

			typePayload.publicData = {
				type,
				username: `${data.username}`,
				folder: data.folder && data.insideFolder ? data.folder : undefined,
				issuer: `${data.issuer}`,
				keyOwner: fullTagName,
				category: `${fullTagName}_zotp`,
			};
			break;
		case "password":
			typePayload.metadata = {
				username: `${data.username}`,
				password: `${data.password}`,
			};

			typePayload.publicData = {
				type,
				website: `${data.website}`,
				username: data.username,
				folder: data.folder && data.insideFolder ? data.folder : undefined,
				timestamp: `${new Date().toISOString()}`,
				keyOwner: fullTagName,
				category: `${fullTagName}_password`,
			};
			break;
		case "notes":
			typePayload.metadata = data.keyValuePairs;
			typePayload.publicData = {
				type,
				title: `${data.title}`,
				timestamp: `${new Date().toISOString()}`,
				folder: data.folder && data.insideFolder ? data.folder : undefined,
				keyOwner: fullTagName,
				category: `${fullTagName}_notes`,
			};
			break;
		case "credit_card":
			typePayload.metadata = {
				cardNumber: `${data.cardNumber}`,
				expiryMonth: `${data.expiryMonth}`,
				expiryYear: `${data.expiryYear}`,
				cvv: `${data.cvv}`,
			};

			typePayload.publicData = {
				type,
				card: JSON.stringify({
					name: `${data.cardName}`,
					number: `****-****-****-${data.cardNumber.slice(-4)}`,
					expires: `${data.expiryMonth}/${data.expiryYear.slice(-2)}`,
					bankName: `${data.bankName}`,
				}),
				folder: data.folder && data.insideFolder ? data.folder : undefined,
				timestamp: `${new Date().toISOString()}`,
				keyOwner: fullTagName,
				category: `${fullTagName}_credit_card`,
			};
			break;

		default:
			throw new Error(`Unsupported data type: ${type}`);
	}

	return typePayload;
};

const validateOwnership = async (faceBase64, masterPassword, authToken, extraParams) => {
	const sessionParams = {
		tagName: authToken.tagName || authToken.identifier,
		domain: authToken.domain,
		faceBase64,
		password: masterPassword,
	};

	if (extraParams.removePGP) {
		sessionParams.removePGP = true;
	}
	// this will throw an error if the tag is not found or the password is incorrect or the face is incorrect
	await TagsModule.decryptTag(sessionParams, authToken);

	console.log("validated successfully", {
		tagName: sessionParams.tagName,
		domain: sessionParams.domain,
		authToken,
	});
};

const _store = async (publicData, metadata, faceBase64, identifier, authToken, type) => {
	const zelfKey = {
		zelfProof: null,
		zelfProofQRCode: null,
	};

	const dataToEncrypt = {
		publicData,
		metadata,
		faceBase64,
		_id: identifier,
		tolerance: "REGULAR",
		addServerPassword: false,
	};

	await TagsPartsModule.generateZelfProof(dataToEncrypt, zelfKey);

	// Store ZOTP in Walrus if type is zotp

	zelfKey.walrus = await WalrusModule.zelfKeyStorage(zelfKey.zelfProofQRCode, {
		zelfProof: zelfKey.zelfProof,
		publicData,
	});

	// now save it in IPFS
	zelfKey.ipfs = await ZelfKeyIPFSModule.saveZelfKey(
		{
			zelfProofQRCode: zelfKey.zelfProofQRCode,
			identifier,
			publicData: { ...publicData, walrus: zelfKey.walrus.blobId },
		},
		authToken
	);

	return zelfKey;
};

/**
 * Store website passwords
 * @param {Object} data
 * @param {string} data.website - Website URL or name
 * @param {string} data.username - Username/email for the site
 * @param {string} data.password - Password for the site
 * @param {string} data.notes - Additional notes
 * @param {string} data.faceBase64 - User's face for encryption
 * @param {string} data.password - User's master password
 * @returns {Promise<Object>}
 */
// Helper function to generate short timestamp (e.g., H2M0)
const getShortTimestamp = () => {
	const now = new Date();
	const hours = now.getHours();
	const minutes = now.getMinutes();
	return `H${hours}M${minutes}`;
};

/**
 * Validate credit card data
 * @param {Object} data
 * @param {string} data.cardNumber - Credit card number
 * @param {string} data.expiryMonth - Expiry month (MM)
 * @param {string} data.expiryYear - Expiry year (YYYY)
 */
const _validateCreditCardData = (cardNumber, expiryMonth, expiryYear) => {
	if (!cardNumber || cardNumber.length < 13 || cardNumber.length > 19) {
		throw new Error("Invalid credit card number");
	}

	const currentYear = new Date().getFullYear();

	const currentMonth = new Date().getMonth() + 1;

	if (parseInt(expiryYear) < currentYear || (parseInt(expiryYear) === currentYear && parseInt(expiryMonth) < currentMonth)) {
		throw new Error("Credit card has expired");
	}

	if (parseInt(expiryMonth) < 1 || parseInt(expiryMonth) > 12) {
		throw new Error("Invalid expiry month");
	}
};

/**
 * Main function to handle different types of data storage
 * @param {Object} data
 * @param {string} data.type - Type of data to store (password, notes, credit_card)
 * @param {Object} data.payload - Data payload specific to the type
 * @param {string} data.faceBase64 - User's face for encryption
 * @param {string} data.password - User's master password
 * @returns {Promise<Object>}
 */
const storeData = async (data, authToken) => {
	try {
		const { type } = data;

		// decrypt Password and FaceBase64
		const decryptedParams = await TagsPartsModule.decryptParams(
			{
				password: data.masterPassword,
				faceBase64: data.faceBase64,
			},
			authToken
		);

		const faceBase64 = decryptedParams.face;

		await validateOwnership(data.faceBase64, data.masterPassword, authToken, data);

		const { metadata, publicData, fullTagName } = await createMetadataAndPublicData(type, { ...data, faceBase64 }, authToken);

		const shortTimestamp = getShortTimestamp();

		const identifier = `${fullTagName}_${shortTimestamp}`;

		const result = await _store(publicData, metadata, faceBase64, identifier, authToken, type);

		return {
			...result,
			type,
			message: "Data stored successfully",
		};
	} catch (error) {
		console.error("Error in storeData:", error);
		throw error;
	}
};

/**
 * Retrieve stored data using ZelfProof
 * @param {Object} data
 * @param {string} data.zelfProof - Encrypted ZelfProof
 * @param {string} data.faceBase64 - User's face for decryption
 * @param {string} data.password - User's master password
 * @returns {Promise<Object>}
 */
const retrieveData = async (data, authToken) => {
	try {
		const { zelfProof, faceBase64, password } = data;

		const decryptedParams = await TagsPartsModule.decryptParams(
			{
				password,
				faceBase64,
			},
			authToken
		);

		// Decrypt using ZelfProof module
		const zelfKey = await ZelfProofModule.decrypt({
			zelfProof,
			faceBase64: decryptedParams.face,
			password: decryptedParams.password,
			os: "DESKTOP",
		});

		return zelfKey;
	} catch (error) {
		console.error("Error retrieving data:", error);

		throw new Error("409:failed_to_retrieve_data");
	}
};

/**
 * Preview stored data without full decryption
 * @param {Object} data
 * @param {string} data.zelfProof - Encrypted ZelfProof
 * @param {string} data.faceBase64 - User's face for preview
 * @returns {Promise<Object>}
 */
const previewData = async (data, authToken) => {
	try {
		const { zelfProof, faceBase64 } = data;

		return {
			success: true,
			publicData: null,
			message: "Data preview successful",
		};
	} catch (error) {
		console.error("Error previewing data:", error);
		throw new Error("Failed to preview data");
	}
};

/**
 * Create NFT-ready data structure from ZelfKey storage
 * This function prepares the data for NFT minting with proper metadata
 * @param {Object} data
 * @param {string} data.zelfProof - Encrypted ZelfProof string
 * @param {string} data.faceBase64 - User's face for verification
 * @param {string} data.password - User's master password
 * @returns {Promise<Object>} NFT-ready data structure
 */
const createNFTReadyData = async (data, authToken) => {
	try {
		const { zelfProof, faceBase64, password } = data;

		const retrievedData = await retrieveData(
			{
				zelfProof,
				faceBase64,
				password,
			},
			authToken
		);

		if (!retrievedData.success || !retrievedData.data.ipfs) {
			throw new Error("No IPFS data available for NFT creation");
		}

		const { ipfs, publicData } = retrievedData.data;

		// Create NFT-ready structure
		const nftReadyData = {
			success: true,
			zelfKeyData: {
				publicData,
				ipfs: {
					hash: ipfs.hash,
					gatewayUrl: ipfs.gatewayUrl,
					pinSize: ipfs.pinSize,
					timestamp: ipfs.timestamp,
					name: ipfs.name,
					metadata: ipfs.metadata,
				},
				message: `NFT-ready data created from ${publicData.type}`,
				timestamp: new Date().toISOString(),
			},
			nftMetadata: {
				name: `ZelfKey ${publicData.type.replace(/_/g, " ").replace(/\b\w/g, (l) => l.toUpperCase())}`,
				description: `Secure ${publicData.type.replace(/_/g, " ")} stored with ZelfKey biometric encryption`,
				image: ipfs.gatewayUrl,
				external_url: "https://zelf.world",
				attributes: [
					{
						trait_type: "Data Type",
						value: publicData.type.replace(/_/g, " ").replace(/\b\w/g, (l) => l.toUpperCase()),
					},
					{
						trait_type: "Storage Method",
						value: "ZelfKey Biometric Encryption",
					},
					{
						trait_type: "Security Level",
						value: "Maximum",
					},
					{
						trait_type: "IPFS Hash",
						value: ipfs.hash,
					},
					{
						trait_type: "Timestamp",
						value: ipfs.timestamp,
					},
					{
						trait_type: "Project",
						value: "ZelfKey Avalanche Integration",
					},
				],
				properties: {
					files: [
						{
							type: "image/png",
							uri: ipfs.gatewayUrl,
						},
					],
					category: "image",
					zelfKey: {
						type: publicData.type,
						encrypted: true,
						biometric: true,
						ipfs: {
							hash: ipfs.hash,
							gateway: ipfs.gatewayUrl,
						},
					},
				},
			},
			message: "NFT-ready data structure created successfully",
		};

		return nftReadyData;
	} catch (error) {
		console.error("Error creating NFT-ready data:", error);
		throw new Error(`Failed to create NFT-ready data: ${error.message}`);
	}
};

/**
 * List data by category
 * @param {Object} data - Query parameters
 * @param {Object} authToken - Authentication token
 * @returns {Promise<Object>} List of data items in the specified category
 */
const listData = async (data, authToken) => {
	try {
		const { category } = data;
		const identifier = authToken.tagName || authToken.identifier;
		const domain = authToken.domain || "zelf";
		const fullTagName = TagsPartsModule.getFullTagName(identifier, domain);

		let searchCategory = category;

		let results = [];

		searchCategory = `${fullTagName}_${category}`;

		// Search IPFS for tags where category matches
		const ipfsResults = await IPFS.filter("category", searchCategory);

		// Format results to return publicData and relevant information
		if (ipfsResults && Array.isArray(ipfsResults)) {
			// Process results asynchronously to get zelfProofQRCode
			const formattedResults = await Promise.all(
				ipfsResults.map(async (item) => {
					// Extract publicData from the item
					const publicData = item.publicData || {};

					// Only include items that match the category (filter in case of partial matches)
					if (publicData.category !== searchCategory) {
						return null;
					}

					// Convert IPFS URL to base64 for zelfProofQRCode
					let zelfProofQRCode = item.zelfProofQRCode;

					let zelfProof = null;

					if (!zelfProofQRCode && item.url) {
						try {
							zelfProofQRCode = await TagsPartsModule.urlToBase64(item.url);
							zelfProof = await QRZelfProofExtractor.extractZelfProofFromQR(zelfProofQRCode);
						} catch (error) {
							console.error("Error converting URL to base64:", error);
							// Continue without zelfProofQRCode if conversion fails
						}
					}

					const formattedItem = {
						id: item.id || item.cid,
						cid: item.cid,
						url: item.url,
						publicData,
						zelfProofQRCode,
						zelfProof,
						createdAt: item.created_at || item.createdAt,
						updatedAt: item.updated_at || item.updatedAt,
					};

					return formattedItem;
				})
			);

			// Remove null entries
			results = formattedResults.filter(Boolean);
		}

		return {
			success: true,
			message: `Found ${results.length} items in category: ${category}`,
			category,
			data: results,
			timestamp: new Date().toISOString(),
			fullTagName,
			searchCategory,
			totalCount: results.length,
		};
	} catch (error) {
		console.error("Error listing data:", error);
		throw new Error(`Failed to list data: ${error.message}`);
	}
};

const deleteZelfKey = async (data, authToken) => {
	try {
		const { id, faceBase64, masterPassword } = data;

		await validateOwnership(faceBase64, masterPassword, authToken, data);

		const result = await IPFS.deleteFiles([id]);

		return {
			result,
			success: true,
			message: "ZelfKey deleted successfully",
		};
	} catch (error) {
		if (error?.message && typeof error.message === "string") {
			const normalizedMessage = error.message.toLowerCase();

			if (normalizedMessage.includes("password") && normalizedMessage.includes("invalid")) {
				throw new Error("400:ERR_INVALID_PASSWORD");
			}

			if (normalizedMessage.includes("liveness") || normalizedMessage.includes("face")) {
				throw new Error("400:ERR_LIVENESS_FAILED");
			}
		}

		throw error;
	}
};

module.exports = { storeData, retrieveData, previewData, createNFTReadyData, listData, deleteZelfKey };
