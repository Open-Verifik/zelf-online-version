const { Ed25519Keypair } = require("@mysten/sui.js/keypairs/ed25519");
const { SuiClient } = require("@mysten/sui.js/client");
const config = require("../../../Core/config");
const axios = require("axios");

const SUI_RPC_URL = "https://fullnode.mainnet.sui.io:443";
const WALRUS_API_URL = "https://api.walrus.gg";

const uploadZelfProofQRCode = async (zelfProofQRCode, metadata = {}) => {
	try {
		// Convert base64 to buffer
		const base64Data = zelfProofQRCode.replace(/^data:image\/\w+;base64,/, "");
		const buffer = Buffer.from(base64Data, "base64");

		// Create form data for the upload
		const formData = new FormData();
		formData.append("file", new Blob([buffer], { type: "image/png" }), "zelfproof.png");
		formData.append(
			"metadata",
			JSON.stringify({
				zelfProof: true,
				...metadata,
			})
		);

		// Get the keypair for signing
		const keypair = Ed25519Keypair.fromSecretKey(
			Buffer.from(config.env === "development" ? config.sui.hold.secretKey : config.sui.secretKey, "hex")
		);

		// Upload to Walrus API
		const response = await axios.post(`${WALRUS_API_URL}/files/upload`, formData, {
			headers: {
				"Content-Type": "multipart/form-data",
				Authorization: `Bearer ${keypair.getPublicKey().toBase64()}`,
			},
		});

		if (!response.data?.id) {
			throw new Error("Failed to upload file to Walrus");
		}

		return {
			id: response.data.id,
			url: `${WALRUS_API_URL}/files/${response.data.id}`,
			explorerUrl: `https://suiexplorer.com/object/${response.data.id}`,
		};
	} catch (error) {
		console.error("Error uploading zelfProof QRCode:", error);
		throw error;
	}
};

const searchZelfProof = async (extraConditions = {}) => {
	if (!extraConditions.key || !extraConditions.value) return null;

	try {
		const response = await axios.get(`${WALRUS_API_URL}/files/search`, {
			params: {
				key: extraConditions.key,
				value: extraConditions.value,
			},
		});

		return response.data.data || [];
	} catch (error) {
		console.error("Error searching zelfProof:", error);
		throw error;
	}
};

const getZelfProofImage = async (fileId) => {
	try {
		const response = await axios.get(`${WALRUS_API_URL}/files/${fileId}`, {
			responseType: "arraybuffer",
		});

		if (response?.data) {
			const base64Image = Buffer.from(response.data).toString("base64");
			return `data:image/png;base64,${base64Image}`;
		}
	} catch (error) {
		console.error("Error fetching zelfProof image:", error);
		throw error;
	}
};

module.exports = {
	uploadZelfProofQRCode,
	searchZelfProof,
	getZelfProofImage,
};
