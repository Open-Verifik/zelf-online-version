const WalrusModule = require("./modules/walrus.module");

// Example usage of the Walrus module
async function exampleUsage() {
	try {
		// Example base64 QR code (this would be generated from your QR code generation process)
		const exampleQRCode =
			"data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==";

		// Example zelfName object (this would come from your application)
		const zelfNameObject = {
			zelfProof: "encrypted_proof_data_here",
			hasPassword: "true",
			publicData: {
				ethAddress: "0x1234567890123456789012345678901234567890",
				solanaAddress: "ABC123DEF456GHI789JKL012MNO345PQR678STU901",
				btcAddress: "bc1qxy2kgdygjrsqtzq2n0yrf2493p83kkfjhx0wlh",
				zelfName: "example.zelf",
				origin: "online",
			},
		};

		console.log("🚀 Starting Walrus upload example...");
		console.log("📦 ZelfName Object:", JSON.stringify(zelfNameObject, null, 2));

		// Upload the QR code to Walrus
		const result = await WalrusModule.zelfNameRegistration(exampleQRCode, zelfNameObject);

		console.log("✅ Upload successful!");
		console.log("📄 Result:", JSON.stringify(result, null, 2));

		if (result.blobId) {
			console.log("🔗 Access your file at:", result.url);
			console.log("🔍 View on explorer:", result.explorerUrl);

			// Test retrieval
			console.log("🔄 Testing file retrieval...");
			const retrievedImage = await WalrusModule.walrusIDToBase64(result.blobId);

			if (retrievedImage) {
				console.log("✅ File retrieved successfully!");
				console.log("📸 Retrieved image size:", retrievedImage.length, "characters");
			} else {
				console.log("❌ Failed to retrieve file");
			}
		}

		// Test search functionality
		console.log("🔍 Testing search functionality...");
		const searchResult = await WalrusModule.search({
			key: "zelfName",
			value: "example.zelf",
		});

		console.log("🔍 Search result:", JSON.stringify(searchResult, null, 2));
	} catch (error) {
		console.error("❌ Error during Walrus operations:", error);

		// Common error scenarios
		if (error.message.includes("insufficient funds")) {
			console.log("💰 Please ensure your wallet has sufficient SUI and WAL tokens");
		} else if (error.message.includes("private key")) {
			console.log("🔑 Please check your WALRUS_PRIVATE_KEY environment variable");
		} else if (error.message.includes("network")) {
			console.log("🌐 Please check your network connection and RPC endpoint");
		}
	}
}

// Test with a file that exceeds size limit
async function testFileSizeLimit() {
	try {
		console.log("\n🧪 Testing file size limit...");

		// Create a large base64 string that exceeds 100KB
		const largeImageData = "data:image/png;base64," + "A".repeat(150000); // ~150KB

		const result = await WalrusModule.zelfNameRegistration(largeImageData, {
			zelfProof: "test_proof",
			hasPassword: "false",
			publicData: {
				zelfName: "large-file.zelf",
			},
		});

		console.log("📊 Large file test result:", JSON.stringify(result, null, 2));
	} catch (error) {
		console.error("❌ Large file test error:", error);
	}
}

// Run the examples
if (require.main === module) {
	console.log("🎯 Walrus Module Example");
	console.log("========================");

	// Run the main example
	exampleUsage()
		.then(() => testFileSizeLimit())
		.then(() => {
			console.log("\n✨ Example completed!");
		})
		.catch((error) => {
			console.error("💥 Example failed:", error);
		});
}

module.exports = {
	exampleUsage,
	testFileSizeLimit,
};
