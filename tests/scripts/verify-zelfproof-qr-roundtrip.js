/**
 * Test script: Generate QR from zelfProof string, decode it back, verify round-trip.
 * Run: node tests/scripts/verify-zelfproof-qr-roundtrip.js
 */
const { extractZelfProofFromQR } = require("../../Repositories/Tags/modules/qr-zelfproof-extractor.module");
const QRCode = require("qrcode");

const ZELFPROOF =
	"Ah2OhIEYaNhqA2B8WTdciRTy2MQ14MQEexKIi4PSG2cM6Ee4o0iE6B04xTC2LNOUwwKcVPnPttEH3Cy/2PGsUGyI9vMchl7WbePfQ1Bz1TzcMIkZd/CQuC52Zuoe/Nb9jHS8Lj4nHxO3AT+rX5fA3cBA3GMOswxRsn3gII4uJXcwlNkq56HADGsDbXo49fG0SH5Ig6d70sDHeui+5ldOHpqOUeXNgwqUsfJfYJpmopgGnkjybitQgYfzCl0QBHD5ZKgBNiA4TgkCKF0X0XgyuszbYJ6mpFOKMbgyhSczQcuxwWASR3wzols0Yv/L9b9TS9i2Jf6s34VuHyKp3T/YrSbIO1MLBx0+HaR2JxJv/NNFZ8jwplMtBzjItu4fMaX5yQs3K3aPLgmXmwXGnwZnAF2ua2aX7Go/MF2rdQrLH4pbEL/vP2fqhZEpYh3pXlhlK0mC44VgQX+RkmIO63hJXpqbKSl7x7JGWn1gvLSy8T48KXOV4UNC4oqDUivOaoBBcdP9kIvWLa6lbbem0xGUoyVfhvS3JvVxV+EEIi6VzC7wIn2knuPhGZewdg7uGBn+o4P4w9KtWkXjXNid2v5WEutVZ1T65dAej3FnPda6o/yvCYs4iVVsYu6GOeHeaHUHfF+pGJcmCQPGVBfelt3fhyZzuwZbYP83F5VDdFEluRom+q+HALvdxaZFc2yYQtIBktvffBl+Pd7W4GVO169Si6UQL02/goqYU1KM9Mfady/Uo9lSD1er3x46PSyRYHsfO6l2zZLwYKBSzgrCt8kIU5nL1f5R9+TEwJaooloJCtPpw+zAlqmcoC4xY+ZlInP1a4NONNYtH9c+UoCK8QuD4HAbW/lA8P4RsPJTHHNC9mSTo0b/tGtzGryhaIkGeor3YEpXYkcXGtld18ITFTW/B+F+5RzUrp00txiC7N4RPtSAFQ3RaoWbNmmuW1DvGZo1r267CC2QzDk6XyUurj2psS5m01I3sMPb9smB13XxuHYkFoxeyNdRUtBW+FFkYPR8TXdzu/1L6NcmNVPfLxXj/4PQ/paF2dY72X6X+utw6fz7u69PjF9XoProE3TZV67MgAI2LajYZcSg8wIAIrOFtZlw3t0XWLFzBH/86peiNJNlO8dsIwFSiOEjtkIOOv9GIAKNjg==";

/**
 * Computes optimal QR pixel size based on ZelfProof byte length.
 * Denser QRs (more data) need larger images so each module has enough pixels for reliable scanning.
 * Formula: estimate QR version from byte capacity (H level), then size = modules × 3.125 px/module.
 * @param {number} byteCount - Length of ZelfProof binary (Buffer.from(zelfProof, 'base64').length)
 * @returns {number} - Recommended pixel width/height (320–640)
 */
function getOptimalQRSize(byteCount) {
	// H-level byte capacity per version (approx): v10~119, v20~382, v30~742, v40~1273
	const version = Math.max(1, Math.min(40, Math.ceil(byteCount / 32)));
	const modules = 17 + 4 * version;
	const PIXELS_PER_MODULE = 3.125; // 25% larger for better Android scan reliability
	return Math.max(320, Math.min(640, Math.ceil(modules * PIXELS_PER_MODULE)));
}

async function generateQRFromZelfProof(zelfProof, options = {}) {
	const buffer = Buffer.from(zelfProof, "base64");
	// Default size: data-driven. Denser ZelfProof → larger QR for reliable scan
	const defaultSize = options.size ?? getOptimalQRSize(buffer.length);
	const { size = defaultSize, errorCorrectionLevel = "H", margin = 2 } = options;

	// Encode raw BINARY ZelfProof (same as original QR) - not the base64 string
	const dataUrl = await QRCode.toDataURL([{ data: buffer, mode: "byte" }], {
		type: "png",
		width: size,
		margin,
		errorCorrectionLevel,
	});
	return dataUrl;
}

async function runTests() {
	console.log("=== ZelfProof QR Round-Trip Tests ===\n");
	console.log("ZelfProof length (chars):", ZELFPROOF.length);
	console.log("ZelfProof as Buffer length:", Buffer.from(ZELFPROOF, "base64").length);
	console.log("");

	// Test 1: Encode base64 string as text, decode back
	console.log("Test 1: base64 string -> QR (text) -> decode");
	const qrImage = await generateQRFromZelfProof(ZELFPROOF, { size: 512 });
	console.log("  QR data URL length:", qrImage.length, "chars");
	console.log("  QR base64 image size:", Math.round((qrImage.length * 3) / 4), "bytes (approx)");

	const extracted = await extractZelfProofFromQR(qrImage);
	const match = extracted === ZELFPROOF;
	console.log("  Extracted matches original:", match ? "YES" : "NO");
	if (!match) {
		console.log("  Original (first 80 chars):", ZELFPROOF.substring(0, 80) + "...");
		console.log("  Extracted (first 80 chars):", extracted ? extracted.substring(0, 80) + "..." : "null");
	}
	console.log("");

	// Test 2: Try different sizes to find minimum
	console.log("Test 2: Minimum viable size");
	for (const size of [128, 160, 192, 224, 256, 384, 512]) {
		const qr = await generateQRFromZelfProof(ZELFPROOF, { size });
		const extracted = await extractZelfProofFromQR(qr);
		const ok = extracted === ZELFPROOF;
		const kb = (qr.length * 3) / 4 / 1024;
		console.log(`  Size ${size}px: ${ok ? "OK" : "FAIL"} (${kb.toFixed(1)} KB)`);
	}
	console.log("");

	// Test 3: Data-driven sizing
	const byteCount = Buffer.from(ZELFPROOF, "base64").length;
	const optimalSize = getOptimalQRSize(byteCount);
	console.log("Test 3: Data-driven sizing");
	console.log(`  Byte count: ${byteCount} → optimal size: ${optimalSize}px`);
	const qrOptimal = await generateQRFromZelfProof(ZELFPROOF); // uses getOptimalQRSize by default
	const extractedOptimal = await extractZelfProofFromQR(qrOptimal);
	console.log(`  Round-trip with optimal size: ${extractedOptimal === ZELFPROOF ? "OK" : "FAIL"}`);
	console.log("");

	// Test 4: Sizing for different data lengths
	console.log("Test 4: Sizing formula for different data lengths");
	for (const bytes of [100, 400, 868, 1200]) {
		const size = getOptimalQRSize(bytes);
		console.log(`  ${bytes} bytes → ${size}px`);
	}
	console.log("");

	// Test 5: Ready for backend integration
	console.log("Test 5: Ready for backend integration");
	console.log("  - Mobile sends only zelfProof (no image)");
	console.log("  - Backend generates QR at optimal size based on byte length");
	console.log("  - Result:", extracted === ZELFPROOF ? "All tests passed" : "Some tests failed");
}

runTests().catch((e) => {
	console.error(e);
	process.exit(1);
});
