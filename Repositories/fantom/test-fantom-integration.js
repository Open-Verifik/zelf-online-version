const FantomModule = require("./modules/fantom-scrapping.module");

async function testFantomIntegration() {
	console.log("🚀 Testing Fantom Blockchain Integration\n");

	// Test addresses (Fantom addresses)
	const testAddress1 = "0x2B4C76d0dc16BE1C31D4C1DC53bF9B45987Fc75c"; // Fantom Foundation
	const testAddress2 = "0x8d591c4b8512cd5764a53719379d005bb63f7b94"; // Another Fantom address

	try {
		console.log("1. Testing Address Balance...");
		const addressData = await FantomModule.getAddress({ address: testAddress1 });
		console.log("✅ Address Data:", JSON.stringify(addressData, null, 2));

		console.log("\n2. Testing Second Address Balance...");
		const addressData2 = await FantomModule.getAddress({ address: testAddress2 });
		console.log("✅ Second Address Data:", JSON.stringify(addressData2, null, 2));

		console.log("\n3. Testing Token Holdings...");
		const tokens = await FantomModule.getTokens({ address: testAddress1 }, { show: "10" });
		console.log("✅ Tokens:", JSON.stringify(tokens, null, 2));

		console.log("\n4. Testing Transaction List...");
		const transactions = await FantomModule.getTransactionsList({
			address: testAddress1,
			page: "0",
			show: "5",
		});
		console.log("✅ Transactions:", JSON.stringify(transactions, null, 2));

		console.log("\n5. Testing Gas Tracker...");
		const gasTracker = await FantomModule.getGasTracker({});
		console.log("✅ Gas Tracker:", JSON.stringify(gasTracker, null, 2));

		console.log("\n🎉 All Fantom integration tests completed successfully!");
	} catch (error) {
		console.error("❌ Test failed:", error.message || "Unknown error");
		console.error("Error details:", error.code || "No error code");
	}
}

testFantomIntegration();
