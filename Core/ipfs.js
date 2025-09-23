require("dotenv").config();
const FormData = require("form-data");
const axios = require("axios");

const prefix = process.env.NODE_ENV === "development" ? "_" : "";

const pinataApiKey = process.env[`${prefix}PINATA_API_KEY`];
const pinataApiSecret = process.env[`${prefix}PINATA_API_SECRET`];

const pinataGateway = process.env[`${prefix}PINATA_GATEWAY_URL`];

const os = process.env.ENVOS;

const pinataWeb3 = require("pinata");

/**
 * Helper function to format metadata keyvalues for Pinata API
 * Converts simple key:value pairs to Pinata's expected format
 * @param {Object} metadata - Simple key:value metadata object
 * @returns {Object} - Formatted metadata for Pinata
 *
 * NOTE: Currently not used because we're using Pinata API v1 for uploads
 * which expects simple key:value pairs. This function is ready for when
 * we switch to the new Pinata SDK v2+ which expects complex format.
 */
const formatMetadataForPinata = (metadata) => {
	if (!metadata || typeof metadata !== "object") {
		return {};
	}

	const formattedKeyvalues = {};

	Object.entries(metadata).forEach(([key, value]) => {
		// If value is already in Pinata format, use it as-is
		if (typeof value === "object" && value !== null && "value" in value && "op" in value) {
			formattedKeyvalues[key] = value;
		} else {
			// Convert simple key:value to Pinata format
			formattedKeyvalues[key] = {
				value: String(value),
				op: "eq", // Default to equality operation
			};
		}
	});

	return formattedKeyvalues;
};

/**
 * Helper function to parse metadata keyvalues from Pinata API response
 * Converts Pinata's format back to simple key:value pairs for easier use
 * @param {Object} keyvalues - Pinata formatted keyvalues object
 * @returns {Object} - Simple key:value metadata object
 */
const parseMetadataFromPinata = (keyvalues) => {
	if (!keyvalues || typeof keyvalues !== "object") {
		return {};
	}

	const simpleMetadata = {};

	Object.entries(keyvalues).forEach(([key, value]) => {
		// If value is in Pinata format, extract the actual value
		if (typeof value === "object" && value !== null && "value" in value) {
			simpleMetadata[key] = value.value;
		} else {
			// If it's already a simple value, use it as-is
			simpleMetadata[key] = value;
		}
	});

	return simpleMetadata;
};

// Use JWT authentication for new SDK v2.5.0
const web3Instance = new pinataWeb3.PinataSDK({
	pinataJwt: process.env[`${prefix}PINATA_JWT`],
	pinataGateway,
});

const upload = async (base64Image, filename = "image.png", mimeType = "image/png", metadata = {}) => {
	try {
		// Use the new Pinata SDK v2.5.0 with JWT authentication
		const base64Data = base64Image.replace(/^data:image\/\w+;base64,/, "");

		const uploadResponse = await web3Instance.upload.public.base64(base64Data).name(filename).keyvalues(metadata);

		const expiresIn = 1800;

		// Create URL using the gateway
		const url = `https://${pinataGateway}/ipfs/${uploadResponse.cid}`;

		return {
			...uploadResponse,
			url,
			urlExpiresIn: expiresIn,
			metadata,
		};
	} catch (error) {
		console.error("Error uploading file:", error);
	}

	return null;
};

const retrieve = async (cid, expires = 1800) => {
	if (!cid) return null;

	try {
		// Use the new Pinata SDK v2.5.0 with JWT authentication
		const pinnedFiles = await web3Instance.listFiles().cid(cid);

		const url = await web3Instance.createSignedURL({
			cid,
			expires,
		});

		return { url, pinnedFiles };
	} catch (exception) {
		const error = new Error(exception.message || "file_not_found");

		error.status = exception.status || 404;

		throw error; // Rethrow to ensure higher-level code catches this.
	}
};

/**
 * pin a file into Pinata IPFS
 * @param {String} base64Image
 * @param {String} filename
 * @param {String} mimeType
 * @param {Object} metadata
 * @returns ipfs file
 */
const pinFile = async (base64Image, filename = "image.png", mimeType = "image/png", metadata = {}) => {
	if (os === "Win") return await pinFileWindows(base64Image, filename, mimeType, metadata);

	try {
		const base64Data = base64Image.replace(/^data:image\/\w+;base64,/, "");

		// Upload the file to Pinata using the new API
		const uploadResponse = await web3Instance.upload.public.base64(base64Data).name(filename).keyvalues(metadata);

		console.log("uploadResponse", uploadResponse);
		return {
			url: `https://${pinataGateway}/ipfs/${uploadResponse.cid}`,
			cid: uploadResponse.cid,
			ipfs_pin_hash: uploadResponse.cid,
			ipfsHash: uploadResponse.cid,
			pinned: true,
			web3: true,
			name: filename,
			publicData: uploadResponse.keyvalues,
		};
	} catch (error) {
		console.error(error);
	}

	return null;
};

const pinFileWindows = async (base64Image, filename = "image.png", mimeType = "image/png", metadata = {}) => {
	const PINATA_API_KEY = process.env[`${prefix}PINATA_API_KEY`];

	const PINATA_SECRET_API_KEY = process.env[`${prefix}PINATA_API_SECRET`];

	try {
		const base64Data = base64Image.replace(/^data:image\/\w+;base64,/, "");

		const formData = new FormData();

		const buffer = Buffer.from(base64Data, "base64");
		formData.append("file", buffer, filename);

		if (metadata) {
			formData.append(
				"pinataMetadata",
				JSON.stringify({
					name: filename,
					keyvalues: metadata,
				})
			);
		}

		const response = await axios.post("https://api.pinata.cloud/pinning/pinFileToIPFS", formData, {
			headers: {
				...formData.getHeaders(),
				pinata_api_key: PINATA_API_KEY,
				pinata_secret_api_key: PINATA_SECRET_API_KEY,
			},
		});

		const uploadResponse = response.data;

		return {
			url: `https://${pinataGateway}/ipfs/${uploadResponse.IpfsHash}`,
			...uploadResponse,
			pinned: true,
			web3: true,
			name: filename,
			metadata,
		};
	} catch (error) {
		console.error(error);
		return null;
	}
};

const filter = async (property = "name", value) => {
	let files;

	try {
		// Use the new Pinata SDK v2.5.0 with JWT authentication
		if (property === "name") {
			const nameResponse = await web3Instance.files.public.list().name(value);

			files = nameResponse.files || [];
		} else {
			const keyvaluesResponse = await web3Instance.files.public.list().keyvalues({ [property]: value });

			files = keyvaluesResponse.files || [];
		}

		if (!files || !files.length) return [];

		// Update each file with the URL using the new cid field
		for (let index = 0; index < files.length; index++) {
			const file = files[index];

			// Use cid instead of ipfs_pin_hash for the new API
			if (file.cid && file.cid !== "pending") {
				file.url = `https://${pinataGateway}/ipfs/${file.cid}`;
			}

			// Parse metadata keyvalues to simple format
			if (file.metadata && file.metadata.keyvalues) {
				file.publicData = parseMetadataFromPinata(file.metadata.keyvalues);
			} else if (file.keyvalues) {
				file.publicData = parseMetadataFromPinata(file.keyvalues);
				delete file.keyvalues;
			}
		}

		return files;
	} catch (error) {
		console.error("Error filtering files:", error);
		return [];
	}
};

const unPinFiles = async (CIDs = []) => {
	return await web3Instance.unpin(CIDs);
};

const deleteFiles = async (ids = []) => {
	const unpin = await web3Instance.files.public.delete(ids);

	return unpin;
};

module.exports = {
	upload,
	retrieve,
	pinFile,
	pinFileWindows,
	filter,
	unPinFiles,
	deleteFiles,
};
