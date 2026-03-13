/**
 * Test script for Gemini AI image analysis
 * Tests the analyzeImageWithGemini function with a screenshot
 */

const fs = require("fs");
const path = require("path");
const { analyzeImageWithGemini } = require("./modules/gemini-ai.module");
const socialAccountsConfig = require("./config/social-accounts.config");

// Using service account authentication from gemini_key.json
console.log("🔑 Using service account authentication (gemini_key.json)\n");

/**
 * Convert image file to base64 data URL
 * @param {string} imagePath - Path to the image file
 * @returns {string} Base64 data URL
 */
const imageToBase64 = (imagePath) => {
	try {
		// Read image file
		const imageBuffer = fs.readFileSync(imagePath);

		// Determine MIME type from file extension
		const ext = path.extname(imagePath).toLowerCase();
		const mimeTypes = {
			".png": "image/png",
			".jpg": "image/jpeg",
			".jpeg": "image/jpeg",
			".webp": "image/webp",
		};
		const mimeType = mimeTypes[ext] || "image/png";

		// Convert to base64
		const base64 = imageBuffer.toString("base64");

		// Return as data URL
		return `data:${mimeType};base64,${base64}`;
	} catch (error) {
		console.error("Error converting image to base64:", error);
		throw error;
	}
};

/**
 * Main test function
 */
const testGeminiAnalysis = async () => {
	try {
		console.log("🧪 Starting Gemini AI Test...\n");

		// Path to the screenshot - try different possible extensions
		const possiblePaths = [
			path.resolve(__dirname, "../../cache/x_screenshot.png"),
			path.resolve(__dirname, "../../cache/x_screenshot.jpg"),
			path.resolve(__dirname, "../../cache/x_screenshot.jpeg"),
			path.resolve(__dirname, "../../cache/x_screenshot"),
		];

		let screenshotPath = null;
		for (const testPath of possiblePaths) {
			if (fs.existsSync(testPath)) {
				screenshotPath = testPath;
				break;
			}
		}

		// Check if file exists
		if (!screenshotPath) {
			console.error(`❌ Screenshot not found. Tried:`);
			possiblePaths.forEach((p) => console.error(`   - ${p}`));
			console.log("\nPlease ensure the screenshot file exists at cache/x_screenshot (with .png, .jpg, or .jpeg extension)");
			process.exit(1);
		}

		console.log(`📸 Loading screenshot from: ${screenshotPath}`);

		// Convert image to base64
		const base64Image = imageToBase64(screenshotPath);
		console.log(`✅ Image converted to base64 (${Math.round(base64Image.length / 1024)} KB)\n`);

		// Get X accounts from config
		const xAccounts = socialAccountsConfig.x.accounts;
		console.log(`📋 Testing with X accounts:`, xAccounts.map((acc) => acc.username || acc.displayName).join(", "));
		console.log("");

		// Test X platform
		console.log("🔍 Analyzing screenshot for X (Twitter) follow validation...\n");
		console.log("⏳ Sending request to Gemini AI (this may take a few seconds)...\n");

		const startTime = Date.now();
		const result = await analyzeImageWithGemini(base64Image, "x", xAccounts);
		const duration = Date.now() - startTime;

		console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
		console.log("📊 ANALYSIS RESULTS");
		console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
		console.log(`✅ Action Completed: ${result.actionCompleted ? "YES" : "NO"}`);
		console.log(`📈 Confidence: ${(result.confidence * 100).toFixed(1)}%`);
		console.log(`💬 Reason: ${result.reason}`);
		console.log(`⏱️  Processing Time: ${duration}ms`);
		console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n");

		if (result.actionCompleted) {
			console.log("✅ SUCCESS: The screenshot shows evidence of following the required account!");
		} else {
			console.log("❌ FAILED: The screenshot does not show clear evidence of following the required account.");
		}

		console.log("\n✨ Test completed successfully!");
	} catch (error) {
		console.error("\n❌ Error during test:", error.message);
		console.error("\nFull error:", error);
		process.exit(1);
	}
};

// Run the test
if (require.main === module) {
	testGeminiAnalysis()
		.then(() => {
			process.exit(0);
		})
		.catch((error) => {
			console.error("Unhandled error:", error);
			process.exit(1);
		});
}

module.exports = {
	testGeminiAnalysis,
	imageToBase64,
};
