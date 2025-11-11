const { Buffer } = require("buffer");

// Try to require canvas and jsQR, fallback to alternative if not available
let createCanvas, loadImage, jsQR;
try {
	const canvas = require("canvas");
	createCanvas = canvas.createCanvas;
	loadImage = canvas.loadImage;
} catch (error) {
	console.warn("Canvas module not available, QR extraction will be limited");
	createCanvas = null;
	loadImage = null;
}

try {
	jsQR = require("jsqr");
} catch (error) {
	console.warn("jsQR module not available, falling back to qrcode-reader");
	jsQR = null;
}

// Fallback to qrcode-reader if jsQR is not available
let QrCodeReader = null;
if (!jsQR) {
	try {
		QrCodeReader = require("qrcode-reader");
	} catch (error) {
		console.warn("Neither jsQR nor qrcode-reader available");
	}
}

/**
 * Utility class for extracting ZelfProof from QR codes
 * Converts base64 PNG images containing QR codes to ZelfProof binary data
 */
class QRZelfProofExtractor {
	/**
	 * Extracts ZelfProof from a base64 encoded PNG QR code image
	 * @param {string} base64Image - Base64 encoded PNG image (with or without data URL prefix)
	 * @returns {Promise<string|null>} - Base64 encoded ZelfProof or null if extraction fails
	 */
	static async extractZelfProof(base64Image) {
		if (!base64Image) return null;

		if (base64Image?.includes("https")) {
			const response = await fetch(base64Image);
			const buffer = await response.arrayBuffer();
			const base64 = Buffer.from(buffer).toString("base64");

			base64Image = `data:image/png;base64,${base64}`;
		}

		try {
			// Check if canvas is available
			if (!createCanvas || !loadImage) {
				console.warn("Canvas module not available, cannot extract ZelfProof from QR code");
				return null;
			}

			// Clean the base64 string (remove data URL prefix if present)
			const cleanBase64 = this._cleanBase64String(base64Image);

			// Convert base64 to buffer
			const imageBuffer = Buffer.from(cleanBase64, "base64");

			// Load image using canvas
			const image = await loadImage(imageBuffer);

			// Create canvas and draw image
			const canvas = createCanvas(image.width, image.height);
			const context = canvas.getContext("2d");

			context.drawImage(image, 0, 0, image.width, image.height);

			// Get image data
			const imageData = context.getImageData(0, 0, canvas.width, canvas.height);

			let qrResult = null;

			// Try jsQR first (preferred method, matches frontend)
			if (jsQR) {
				qrResult = jsQR(imageData.data, imageData.width, imageData.height, {
					inversionAttempts: "attemptBoth",
				});
			} else if (QrCodeReader) {
				// Fallback to qrcode-reader - but this won't work for binary data
				console.warn("Using qrcode-reader fallback - this may not work for binary ZelfProof data");
				const qr = new QrCodeReader();
				qrResult = await new Promise((resolve, reject) => {
					qr.callback = (err, value) => {
						if (err) {
							reject(err);
						} else {
							resolve(value);
						}
					};
					qr.decode(imageData);
				});
			} else {
				console.warn("No QR code reader available");
				return null;
			}

			if (!qrResult) {
				console.warn("1. No QR code result");
				return null;
			}

			// Handle jsQR result (preferred)
			if (jsQR && qrResult.binaryData) {
				// Extract binary data like in frontend
				const hexString = this._toHexString(qrResult.binaryData);
				const buffer = Buffer.from(hexString.replace(/\s/g, ""), "hex");
				return buffer.toString("base64");
			}

			// Handle qrcode-reader result (fallback)
			if (QrCodeReader && qrResult.result) {
				let zelfProof = qrResult.result;
				// console.info("QR result from qrcode-reader:", zelfProof);

				// If it's already base64, return it
				if (this._isBase64(zelfProof)) {
					return zelfProof;
				}

				// If it's hex, convert to base64
				if (this._isHex(zelfProof)) {
					const buffer = Buffer.from(zelfProof.replace(/\s/g, ""), "hex");
					return buffer.toString("base64");
				}

				// If it's plain text, try to convert to base64
				const buffer = Buffer.from(zelfProof, "utf8");
				return buffer.toString("base64");
			}

			console.warn("No QR code result");
			return null;
		} catch (error) {
			console.error("Error extracting ZelfProof from QR code:", error);
			return null;
		}
	}

	/**
	 * Cleans base64 string by removing data URL prefix if present
	 * @param {string} base64String - Raw base64 string
	 * @returns {string} - Clean base64 string
	 * @private
	 */
	static _cleanBase64String(base64String) {
		// Remove data URL prefix if present (e.g., "data:image/png;base64,")
		if (base64String.includes(",")) {
			return base64String.split(",")[1];
		}
		return base64String;
	}

	/**
	 * Checks if a string is valid base64
	 * @param {string} str - String to check
	 * @returns {boolean} - True if string is valid base64
	 * @private
	 */
	static _isBase64(str) {
		try {
			return Buffer.from(str, "base64").toString("base64") === str;
		} catch (err) {
			return false;
		}
	}

	/**
	 * Checks if a string is valid hex
	 * @param {string} str - String to check
	 * @returns {boolean} - True if string is valid hex
	 * @private
	 */
	static _isHex(str) {
		return /^[0-9a-fA-F\s]+$/.test(str);
	}

	/**
	 * Converts binary data to hex string
	 * @param {Uint8Array} binaryData - Binary data to convert
	 * @returns {string} - Hex string representation
	 * @private
	 */
	static _toHexString(binaryData) {
		return Array.from(binaryData)
			.map((byte) => byte.toString(16).padStart(2, "0"))
			.join("");
	}

	/**
	 * Validates if the extracted data looks like a valid ZelfProof
	 * @param {string} zelfProof - Base64 encoded ZelfProof
	 * @returns {boolean} - True if data appears to be valid ZelfProof
	 */
	static validateZelfProof(zelfProof) {
		if (!zelfProof || typeof zelfProof !== "string") {
			return false;
		}

		// Basic validation: check if it's valid base64 and has reasonable length
		try {
			const buffer = Buffer.from(zelfProof, "base64");
			// ZelfProof should be at least some minimum size (adjust as needed)
			return buffer.length > 0;
		} catch (error) {
			return false;
		}
	}
}

/**
 * Convenience function for quick ZelfProof extraction
 * @param {string} base64Image - Base64 encoded PNG image
 * @returns {Promise<string|null>} - Base64 encoded ZelfProof or null
 */
async function extractZelfProofFromQR(base64Image) {
	return await QRZelfProofExtractor.extractZelfProof(base64Image);
}

module.exports = {
	QRZelfProofExtractor,
	extractZelfProofFromQR,
};
