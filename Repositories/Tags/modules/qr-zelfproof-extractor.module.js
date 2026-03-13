const { Buffer } = require("buffer");

// Use sharp for image decoding (avoids canvas/sharp native lib conflict)
let sharp;

// QRCode is used to generate QR images from a raw ZelfProof string
let QRCode = require("qrcode");


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

const PNG_SIGNATURE = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
const JPEG_SIGNATURE = Buffer.from([0xff, 0xd8, 0xff]);

function _isPNG(buffer) {
	return buffer.length >= 8 && buffer.slice(0, 8).equals(PNG_SIGNATURE);
}

function _isJPEG(buffer) {
	return buffer.length >= 3 && buffer.slice(0, 3).equals(JPEG_SIGNATURE);
}

function _isSupportedImage(buffer) {
	return _isPNG(buffer) || _isJPEG(buffer);
}

/**
 * Decode image buffer to RGBA pixel data for zxing-wasm
 * @param {Buffer} imageBuffer - PNG or JPEG image buffer
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
 * Converts base64 PNG/JPEG images containing QR codes to ZelfProof binary data
 */
class QRZelfProofExtractor {
	/**
	 * Extracts ZelfProof from a base64 encoded PNG or JPEG QR code image
	 * @param {string} base64Image - Base64 encoded PNG or JPEG image (with or without data URL prefix)
	 * @returns {Promise<string|null>} - Base64 encoded ZelfProof or null if extraction fails
	 */
	static async extractZelfProof(base64Image) {
		if (!base64Image) return null;

		if (base64Image?.includes("https")) {
			try {
				const response = await fetch(base64Image);

				if (!response.ok) {
					console.warn(`extractZelfProof: HTTP ${response.status} for ${base64Image}`);
					return null;
				}

				const contentType = response.headers.get("content-type") || "";
				if (
					!contentType.startsWith("image/png") &&
					!contentType.startsWith("image/jpeg") &&
					!contentType.startsWith("application/octet-stream")
				) {
					console.warn(`extractZelfProof: expected image/png or image/jpeg, got ${contentType} for ${base64Image}`);
					return null;
				}

				const buffer = await response.arrayBuffer();
				const base64 = Buffer.from(buffer).toString("base64");
				base64Image = `data:image/png;base64,${base64}`;
			} catch (fetchError) {
				console.warn("extractZelfProof: fetch failed:", fetchError.message);
				return null;
			}
		}

		try {
			if (!sharp) {
				console.warn("Sharp module not available, cannot extract ZelfProof from QR code");
				return null;
			}

			const cleanBase64 = this._cleanBase64String(base64Image);
			const imageBuffer = Buffer.from(cleanBase64, "base64");

			if (!_isSupportedImage(imageBuffer)) {
				const detected =
					imageBuffer[0] === 0xff && imageBuffer[1] === 0xd8
						? "JPEG"
						: imageBuffer[0] === 0x89
							? "possibly corrupted PNG"
							: "unknown";
				console.warn(
					`ZelfProof QR expected PNG or JPEG, got ${detected} (first bytes: ${imageBuffer.slice(0, 4).toString("hex")})`
				);
				return null;
			}

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
 * @param {string} base64Image - Base64 encoded PNG or JPEG image
 * @returns {Promise<string|null>} - Base64 encoded ZelfProof or null
 */
async function extractZelfProofFromQR(base64Image) {
	return await QRZelfProofExtractor.extractZelfProof(base64Image);
}

/**
 * Computes optimal QR pixel size based on ZelfProof binary byte length.
 * Larger ZelfProofs produce denser QR codes that require more pixels per module
 * to remain reliably scannable on mobile devices (≥2.5 px/module recommended).
 *
 * Formula: estimate QR version from byte count (H-level capacity ≈ byteCount/32),
 * then size = modules × 2.5, clamped to [256, 512].
 *
 * @param {number} byteCount - Length of the raw ZelfProof buffer
 * @returns {number} - Recommended pixel width/height
 */
function getOptimalQRSize(byteCount) {
	const version = Math.max(1, Math.min(40, Math.ceil(byteCount / 32)));
	const modules = 17 + 4 * version;
	return Math.max(256, Math.min(512, Math.ceil(modules * 2.5)));
}

/**
 * Generates a QR code PNG image from a base64-encoded ZelfProof string.
 * Encodes the raw binary data (byte mode) so the QR is identical to the original.
 * Image size is computed automatically from the ZelfProof byte length.
 *
 * @param {string} zelfProof - Base64-encoded ZelfProof
 * @param {Object} [options]
 * @param {number} [options.size] - Width/height in px (default: auto via getOptimalQRSize)
 * @param {string} [options.errorCorrectionLevel="H"] - QR error correction level
 * @param {number} [options.margin=2] - Quiet zone modules around the QR code
 * @returns {Promise<string|null>} - data:image/png;base64,... or null on failure
 */
async function generateQRFromZelfProof(zelfProof, options = {}) {
	if (!zelfProof || typeof zelfProof !== "string") return null;
	if (!QRCode) {
		console.warn("qrcode module not available, cannot generate QR from ZelfProof");
		return null;
	}
	try {
		const buffer = Buffer.from(zelfProof, "base64");
		const size = options.size ?? getOptimalQRSize(buffer.length);
		const { errorCorrectionLevel = "H", margin = 2 } = options;

		const dataUrl = await QRCode.toDataURL([{ data: buffer, mode: "byte" }], {
			type: "png",
			width: size,
			margin,
			errorCorrectionLevel,
		});
		return dataUrl;
	} catch (error) {
		console.error("generateQRFromZelfProof failed:", error.message);
		return null;
	}
}

module.exports = {
	QRZelfProofExtractor,
	extractZelfProofFromQR,
	generateQRFromZelfProof,
	getOptimalQRSize,
};
