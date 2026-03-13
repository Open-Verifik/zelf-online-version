/**
 * Test script to check if Walrus SDK can connect directly to storage nodes
 * This bypasses the public aggregator endpoints that aren't available yet
 *
 * Usage: node test-sdk-direct.js [blob-id]
 */

const { getFullnodeUrl, SuiClient } = require("@mysten/sui/client");

async function testSDKDirect(blobId) {
	let walrusClient;
	let suiClient;

	try {
		// Test 1: Initialize clients

		// Initialize Sui client for mainnet
		suiClient = new SuiClient({
			url: getFullnodeUrl("mainnet"),
		});

		// Try to initialize Walrus client
		const { WalrusClient } = require("@mysten/walrus");
		walrusClient = new WalrusClient({
			network: "mainnet",
			suiClient,
			storageNodeClientOptions: {
				timeout: 60000, // 60 second timeout
				onError: (error) => {},
			},
		});

		// Test 2: Check if blob ID provided
		if (!blobId) {
			blobId = "hE4xX3k0_rrII4117jIHRl2lhQAaR_iQmedOSZXMJ7k";
		}

		const startTime = Date.now();
		const blobData = await walrusClient.readBlob({ blobId });
		const endTime = Date.now();

		if (blobData && blobData.length > 0) {
			// Convert to base64 for testing
			const base64 = Buffer.from(blobData).toString("base64");

			// Test 4: Generate data URL
			const dataUrl = `data:image/png;base64,${base64}`;

			return {
				success: true,
				blobId,
				dataSize: blobData.length,
				dataUrl,
				timeMs: endTime - startTime,
			};
		} else {
			return { success: false, error: "No data returned" };
		}
	} catch (error) {
		return { success: false, error: error.message };
	}
}

// Test recommendations
async function showRecommendations(result) {
	if (result.success) {
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
