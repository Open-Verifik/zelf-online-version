const { Buffer } = require("buffer");

// Use sharp for image decoding (avoids canvas/sharp native lib conflict)
let sharp;
try {
	sharp = require("sharp");
} catch (error) {
	console.warn("Sharp module not available, QR extraction will be limited");
	sharp = null;
}

// zxing-wasm is more robust than jsQR for dense binary QR codes (e.g. ZelfProof)
let readBarcodesFromImageData = null;
try {
	readBarcodesFromImageData = require("zxing-wasm").readBarcodesFromImageData;
} catch (error) {
	console.warn("zxing-wasm not available for QR extraction:", error.message);
}

/**
 * Decode image buffer to RGBA pixel data for zxing-wasm
 * @param {Buffer} imageBuffer - Image buffer (PNG, JPEG, etc.)
 * @returns {Promise<{data: Uint8ClampedArray, width: number, height: number}|null>}
 */
async function getImageDataFromBuffer(imageBuffer) {
	if (!sharp) return null;
	try {
		const { data, info } = await sharp(imageBuffer)
			.ensureAlpha()
			.raw()
			.toBuffer({ resolveWithObject: true });
		return {
			data: new Uint8ClampedArray(data),
			width: info.width,
			height: info.height,
		};
	} catch (err) {
		console.warn("Sharp failed to decode image:", err.message);
		return null;
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
			// Check if sharp is available
			if (!sharp) {
				console.warn("Sharp module not available, cannot extract ZelfProof from QR code");
				return null;
			}

			// Clean the base64 string (remove data URL prefix if present)
			const cleanBase64 = this._cleanBase64String(base64Image);

			// Convert base64 to buffer
			const imageBuffer = Buffer.from(cleanBase64, "base64");

			// Decode image to RGBA pixel data using sharp
			const imageData = await getImageDataFromBuffer(imageBuffer);

			if (!imageData) return null;

			if (!readBarcodesFromImageData) {
				console.warn("No QR code reader available (zxing-wasm)");
				return null;
			}

			const results = await readBarcodesFromImageData(
				{
					data: imageData.data,
					width: imageData.width,
					height: imageData.height,
				},
				{
					formats: ["QRCode"],
					tryHarder: true,
					tryDownscale: true,
					tryRotate: true,
					tryInvert: true,
					maxNumberOfSymbols: 1,
				}
			);

			if (!results || results.length === 0) return null;

			const result = results[0];

			// Prefer raw bytes (binary ZelfProof) over text
			if (result.bytes && result.bytes.length > 0) {
				return Buffer.from(result.bytes).toString("base64");
			}

			// Fallback: if only text is available, try to interpret it
			if (result.text) {
				const text = result.text;
				if (this._isBase64(text)) return text;
				if (this._isHex(text)) {
					return Buffer.from(text.replace(/\s/g, ""), "hex").toString("base64");
				}
				return Buffer.from(text, "utf8").toString("base64");
			}

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
