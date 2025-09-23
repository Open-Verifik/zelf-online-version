const { Buffer } = require("buffer");

// Try to require canvas and jsQR, fallback to alternative if not available
let createCanvas, loadImage, jsQR;
try {
	const canvas = require("canvas");
	createCanvas = canvas.createCanvas;
	loadImage = canvas.loadImage;
} catch (error) {
	console.warn("Canvas module not available, QR operations will be limited");
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

// Try to require qrcode for encoding
let QRCode = null;
try {
	QRCode = require("qrcode");
} catch (error) {
	console.warn("qrcode module not available, QR encoding will not work");
}

/**
 * Utility class for ZelfProof QR code operations
 * Handles both extraction from QR codes and encoding to QR codes
 */
class ZelfProofUtils {
	/**
	 * Extracts ZelfProof from a base64 encoded PNG QR code image
	 * @param {string} base64Image - Base64 encoded PNG image (with or without data URL prefix)
	 * @returns {Promise<string|null>} - Base64 encoded ZelfProof or null if extraction fails
	 */
	static async extractZelfProof(base64Image) {
		try {
			// Check if canvas is available
			if (!createCanvas || !loadImage) {
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
				return null;
			}

			// Handle jsQR result (preferred)
			if (jsQR && qrResult.binaryData) {
				// Extract binary data like in frontend
				const hexString = this._toHexString(qrResult.binaryData);
				const buffer = Buffer.from(hexString.replace(/\s/g, ""), "hex");
				return buffer.toString("base64");
			}

			// Handle jsQR result with text data (when QR contains base64 string)
			if (jsQR && qrResult.data) {
				const data = qrResult.data;

				// If it's already base64, return it
				if (this._isBase64(data)) {
					return data;
				}

				// If it's hex, convert to base64
				if (this._isHex(data)) {
					const buffer = Buffer.from(data.replace(/\s/g, ""), "hex");
					return buffer.toString("base64");
				}

				// If it's plain text, try to convert to base64
				const buffer = Buffer.from(data, "utf8");
				return buffer.toString("base64");
			}

			// Handle qrcode-reader result (fallback)
			if (QrCodeReader && qrResult.result) {
				let zelfProof = qrResult.result;

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

			return null;
		} catch (error) {
			console.error("Error extracting ZelfProof from QR code:", error);
			return null;
		}
	}

	/**
	 * Encodes a ZelfProof into a QR code and returns it as a base64 PNG image
	 * @param {string} zelfProof - Base64 encoded ZelfProof
	 * @param {Object} options - QR code generation options
	 * @param {number} options.size - QR code size in pixels (default: 256)
	 * @param {string} options.errorCorrectionLevel - Error correction level (default: 'M')
	 * @param {number} options.margin - Margin around QR code (default: 4)
	 * @returns {Promise<string|null>} - Base64 encoded PNG image or null if encoding fails
	 */
	static async encodeZelfProofToQR(zelfProof, options = {}) {
		try {
			// Check if qrcode module is available
			if (!QRCode) {
				console.warn("qrcode module not available, cannot encode ZelfProof to QR code");
				return null;
			}

			// Validate ZelfProof
			if (!this.validateZelfProof(zelfProof)) {
				console.error("Invalid ZelfProof provided for encoding");
				return null;
			}

			// Set default options
			const { size = 256, errorCorrectionLevel = "M", margin = 4 } = options;

			// Convert base64 ZelfProof to binary data (same as extraction logic)
			const buffer = Buffer.from(zelfProof, "base64");

			// Convert binary data to hex string (same format as used in extraction)
			const hexString = this._bufferToHexString(buffer);

			// Generate QR code as PNG buffer using hex string
			const qrCodeBuffer = await QRCode.toBuffer(hexString, {
				type: "png",
				width: size,
				margin: margin,
				errorCorrectionLevel: errorCorrectionLevel,
				color: {
					dark: "#000000",
					light: "#FFFFFF",
				},
			});

			// Convert buffer to base64
			const base64Image = qrCodeBuffer.toString("base64");

			// Return with data URL prefix
			return `data:image/png;base64,${base64Image}`;
		} catch (error) {
			console.error("Error encoding ZelfProof to QR code:", error);
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
	 * Converts Buffer to hex string
	 * @param {Buffer} buffer - Buffer to convert
	 * @returns {string} - Hex string representation
	 * @private
	 */
	static _bufferToHexString(buffer) {
		return buffer.toString("hex");
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
	return await ZelfProofUtils.extractZelfProof(base64Image);
}

/**
 * Convenience function for quick ZelfProof encoding
 * @param {string} zelfProof - Base64 encoded ZelfProof
 * @param {Object} options - QR code generation options
 * @returns {Promise<string|null>} - Base64 encoded PNG image or null
 */
async function encodeZelfProofToQR(zelfProof, options = {}) {
	return await ZelfProofUtils.encodeZelfProofToQR(zelfProof, options);
}

module.exports = {
	ZelfProofUtils,
	extractZelfProofFromQR,
	encodeZelfProofToQR,
};
