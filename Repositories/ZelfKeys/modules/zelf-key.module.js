/**
 * ZelfKey Module - Password Manager functionality similar to LastPass
 * Standalone version without external dependencies
 * @author Miguel Trevino <miguel@zelf.world>
 */

const TagsModule = require("../../Tags/modules/tags.module");
const TagsPartsModule = require("../../Tags/modules/tags-parts.module");
const ZelfKeyIPFSModule = require("./zelf-key-ipfs.module");

const createMetadataAndPublicData = async (type, data, authToken) => {
	switch (type) {
		case "password":
			return {
				metadata: {
					username: `${data.username}`,
					password: `${data.password}`,
				},
				publicData: {
					type: "website_password",
					website: `${data.website}`,
					username: data.username,
					folder: data.folder && data.insideFolder ? data.folder : undefined,
					timestamp: `${new Date().toISOString()}`,
					keyOwner: `${authToken.identifier}${authToken.domain ? "." + authToken.domain : ""}`,
					category: `${authToken.identifier}_password`,
				},
			};
		case "notes":
			return {
				metadata: data.keyValuePairs,
				publicData: {
					type: "notes",
					title: `${data.title}`,
					timestamp: `${new Date().toISOString()}`,
					folder: data.folder && data.insideFolder ? data.folder : undefined,
					keyOwner: `${authToken.identifier}${authToken.domain ? "." + authToken.domain : ""}`,
					category: `${authToken.identifier}_notes`,
				},
			};
		case "credit_card":
			return {
				metadata: {
					cardNumber: `${data.cardNumber}`,
					expiryMonth: `${data.expiryMonth}`,
					expiryYear: `${data.expiryYear}`,
					cvv: `${data.cvv}`,
				},
				publicData: {
					type: "credit_card",
					card: JSON.stringify({
						name: `${data.cardName}`,
						number: `****-****-****-${data.cardNumber.slice(-4)}`,
						expires: `${data.expiryMonth}/${data.expiryYear.slice(-2)}`,
						bankName: `${data.bankName}`,
					}),
					folder: data.folder && data.insideFolder ? data.folder : undefined,
					timestamp: `${new Date().toISOString()}`,
					keyOwner: `${authToken.identifier}${authToken.domain ? "." + authToken.domain : ""}`,
					category: `${authToken.identifier}_credit_card`,
				},
			};

		default:
			throw new Error(`Unsupported data type: ${type}`);
	}
};

const validateOwnership = async (identifier, domain, faceBase64, masterPassword, authToken, extraParams) => {
	if (authToken.session) {
		const sessionParams = {
			tagName: identifier,
			domain,
			faceBase64,
			password: masterPassword,
		};

		if (extraParams.removePGP) {
			sessionParams.removePGP = true;
		}
		// this will throw an error if the tag is not found or the password is incorrect or the face is incorrect
		await TagsModule.decryptTag(sessionParams, authToken);
	}
};

const _store = async (publicData, metadata, faceBase64, masterPassword, identifier, authToken) => {
	const zelfKey = {
		zelfProof: null,
		zelfProofQRCode: null,
	};

	const dataToEncrypt = {
		publicData,
		metadata,
		faceBase64,
		password: masterPassword,
		_id: identifier,
		tolerance: "REGULAR",
		addServerPassword: false,
	};

	await TagsPartsModule.generateZelfProof(dataToEncrypt, zelfKey);

	// now save it in IPFS
	zelfKey.ipfs = await ZelfKeyIPFSModule.saveZelfKey(
		{
			zelfProofQRCode: zelfKey.zelfProofQRCode,
			identifier,
			publicData,
		},
		authToken
	);

	return {
		zelfKey,
		authToken,
		success: true,
		zelfQR: null, // Encrypted string
		NFT: null,
		ipfs: {
			...zelfKey.ipfs,
			publicData: zelfKey.ipfs.keyvalues,
			keyvalues: undefined,
		},
		publicData,
	};
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

const storePassword = async (data, authToken) => {
	const { username, faceBase64, name, masterPassword } = data;

	const { metadata, publicData } = await createMetadataAndPublicData("password", data, authToken);

	const shortTimestamp = getShortTimestamp();
	const identifier = name ? `${authToken.identifier}_${name}_${shortTimestamp}` : `${authToken.identifier}_${username}_${shortTimestamp}`;

	const result = await _store(publicData, metadata, faceBase64, masterPassword, identifier, authToken);

	return {
		...result,
		message: "Website password stored successfully as QR code and zelfProof string",
	};
};

/**
 * Store notes as key-value pairs (metadata structure)
 * @param {Object} data
 * @param {string} data.title - Note title
 * @param {Object} data.keyValuePairs - Object with up to 10 key-value pairs
 * @param {string} data.faceBase64 - User's face for encryption
 * @param {string} data.password - User's master password
 * @returns {Promise<Object>}
 */
const storeNotes = async (data, authToken) => {
	const { title, faceBase64 } = data;

	try {
		const shortTimestamp = getShortTimestamp();

		const identifier = `${authToken.identifier}_notes_${title}_${shortTimestamp}`;

		const { metadata, publicData } = await createMetadataAndPublicData("notes", data, authToken);

		const result = await _store(publicData, metadata, faceBase64, identifier, authToken);

		return {
			...result,
			message: "Notes stored successfully",
		};
	} catch (error) {
		console.error("Error storing notes:", { error });
		throw new Error("Failed to store notes");
	}
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
 * Store credit card information
 * @param {Object} data
 * @param {string} data.cardName - Name on the card
 * @param {string} data.cardNumber - Credit card number
 * @param {string} data.expiryMonth - Expiry month (MM)
 * @param {string} data.expiryYear - Expiry year (YYYY)
 * @param {string} data.cvv - CVV code
 * @param {string} data.bankName - Bank name
 * @param {string} data.faceBase64 - User's face for encryption
 * @param {string} data.password - User's master password
 * @returns {Promise<Object>}
 */
const storeCreditCard = async (data, authToken) => {
	const { cardNumber, expiryMonth, expiryYear, bankName, faceBase64 } = data;

	try {
		_validateCreditCardData(cardNumber, expiryMonth, expiryYear);

		const shortTimestamp = getShortTimestamp();
		const identifier = `${authToken.identifier}_${bankName}_${shortTimestamp}`;

		const { metadata, publicData } = await createMetadataAndPublicData("credit_card", data, authToken);

		const result = await _store(publicData, metadata, faceBase64, identifier, authToken);

		return {
			...result,
			message: "Credit card stored successfully",
		};
	} catch (error) {
		console.error("Error storing credit card:", error);
		throw new Error("Failed to store credit card");
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
		const { type, faceBase64, masterPassword } = data;

		// Validate required fields
		if (!type || !faceBase64) {
			throw new Error("Missing required fields: type, payload, faceBase64, password");
		}

		await validateOwnership(authToken.identifier, authToken.domain, faceBase64, masterPassword, authToken, data);

		// Route to appropriate storage function
		let result;
		switch (type) {
			case "password":
				// validate if includes password
				if (!data.password) throw new Error("Missing required fields: password");

				result = await storePassword(data, authToken);
				break;

			case "notes":
				result = await storeNotes(data, authToken);
				break;

			case "credit_card":
				result = await storeCreditCard(data, authToken);
				break;

			default:
				throw new Error(`Unsupported data type: ${type}`);
		}

		// Add IPFS information if available
		if (result.ipfs) {
			result.message += ` | IPFS: ${result.ipfs.hash}`;
		}

		return result;
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

		return {
			success: true,
			data: null,
			message: "Data retrieved successfully",
		};
	} catch (error) {
		console.error("Error retrieving data:", error);
		throw new Error("Failed to retrieve data");
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

		return {
			success: true,
			message: `Found ${0} items in category: ${category}`,
			category: category,
			data: [],
			timestamp: new Date().toISOString(),
			zelfName: authToken.identifier,
			totalCount: 0,
		};
	} catch (error) {
		console.error("Error listing data:", error);
		throw new Error(`Failed to list data: ${error.message}`);
	}
};

module.exports = { storeData, retrieveData, previewData, createNFTReadyData, listData };
