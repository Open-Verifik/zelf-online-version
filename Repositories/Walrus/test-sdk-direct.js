/**
 * Test script to check if Walrus SDK can connect directly to storage nodes
 * This bypasses the public aggregator endpoints that aren't available yet
 *
 * Usage: node test-sdk-direct.js [blob-id]
 */

const { getFullnodeUrl, SuiClient } = require("@mysten/sui/client");

async function testSDKDirect(blobId) {
	console.log("\n🔍 Testing Walrus SDK Direct Node Connection");
	console.log("=".repeat(80));
	console.log(`Blob ID: ${blobId || "Not provided"}`);

	let walrusClient;
	let suiClient;

	try {
		// Test 1: Initialize clients
		console.log("\n1️⃣ Initializing Walrus SDK for mainnet...");
		console.log("-".repeat(50));

		// Initialize Sui client for mainnet
		suiClient = new SuiClient({
			url: getFullnodeUrl("mainnet"),
		});
		console.log("✅ Sui client initialized");

		// Try to initialize Walrus client
		const { WalrusClient } = require("@mysten/walrus");
		walrusClient = new WalrusClient({
			network: "mainnet",
			suiClient,
			storageNodeClientOptions: {
				timeout: 60000, // 60 second timeout
				onError: (error) => {
					console.log("Storage node error:", error.message);
				},
			},
		});
		console.log("✅ Walrus client initialized");

		// Test 2: Check if blob ID provided
		if (!blobId) {
			console.log("\n⚠️  No blob ID provided. Testing with a sample blob ID...");
			blobId = "hE4xX3k0_rrII4117jIHRl2lhQAaR_iQmedOSZXMJ7k";
		}

		// Test 3: Try to read blob
		console.log("\n2️⃣ Testing direct blob read...");
		console.log("-".repeat(50));
		console.log(`Attempting to read blob: ${blobId}`);

		const startTime = Date.now();
		const blobData = await walrusClient.readBlob({ blobId });
		const endTime = Date.now();

		if (blobData && blobData.length > 0) {
			console.log(`✅ Success! Blob retrieved via SDK`);
			console.log(`   Time taken: ${endTime - startTime}ms`);
			console.log(`   Data size: ${blobData.length} bytes`);
			console.log(`   Data type: ${blobData.constructor.name}`);

			// Convert to base64 for testing
			const base64 = Buffer.from(blobData).toString("base64");
			console.log(`   Base64 length: ${base64.length} characters`);
			console.log(`   Base64 preview: ${base64.substring(0, 100)}...`);

			// Test 4: Generate data URL
			console.log("\n3️⃣ Generating data URL...");
			console.log("-".repeat(50));
			const dataUrl = `data:image/png;base64,${base64}`;
			console.log(`✅ Data URL generated (${dataUrl.length} characters)`);
			console.log(`   Ready for frontend: <img src="${dataUrl.substring(0, 50)}..." />`);

			return {
				success: true,
				blobId,
				dataSize: blobData.length,
				dataUrl,
				timeMs: endTime - startTime,
			};
		} else {
			console.log(`❌ No data returned from SDK`);
			return { success: false, error: "No data returned" };
		}
	} catch (error) {
		console.error(`❌ SDK test failed:`, error.message);
		console.error(`   Error type: ${error.constructor.name}`);
		console.error(`   Stack: ${error.stack}`);

		return { success: false, error: error.message };
	}
}

// Test recommendations
async function showRecommendations(result) {
	console.log("\n4️⃣ Recommendations");
	console.log("-".repeat(50));

	if (result.success) {
		console.log("🎉 Great! The Walrus SDK direct connection works!");
		console.log("   This means you can use your existing code:");
		console.log("   ```javascript");
		console.log("   const result = await WalrusModule.prepareImageForFrontend(blobId);");
		console.log("   if (result.success) {");
		console.log("       // Use result.dataUrl in your frontend");
		console.log("   }");
		console.log("   ```");
		console.log("");
		console.log("   Your integration should work without waiting for public endpoints!");
	} else {
		console.log("❌ SDK direct connection failed.");
		console.log("   This might mean:");
		console.log("   1. Walrus SDK mainnet support is still being finalized");
		console.log("   2. Storage nodes are not yet accessible");
		console.log("   3. Network configuration issues");
		console.log("");
		console.log("   Fallback options:");
		console.log("   - Wait for public aggregator endpoints");
		console.log("   - Run your own Walrus aggregator");
		console.log("   - Check Walrus documentation for updates");
	}
}

// Run the test
const blobId = process.argv[2];

if (process.argv.length < 3) {
	console.log(`
Usage: node test-sdk-direct.js [blob-id]

Examples:
  node test-sdk-direct.js hE4xX3k0_rrII4117jIHRl2lhQAaR_iQmedOSZXMJ7k

This will test:
1. Walrus SDK initialization with mainnet
2. Direct blob reading (bypassing aggregator endpoints)
3. Base64 conversion for frontend use
4. Performance metrics
    `);
}

testSDKDirect(blobId)
	.then((result) => {
		return showRecommendations(result);
	})
	.catch((error) => {
		console.error("Test failed:", error);
	});
