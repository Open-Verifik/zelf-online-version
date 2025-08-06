const KavaModule = require("./modules/kava-scrapping.module");

// Test Kava integration
async function testKavaIntegration() {
	console.log("🚀 Testing Kava Blockchain Integration\n");

	// Test addresses - using real addresses from KavaScan
	const testEvmAddress = "0x1671CEB9B46f2dD707d0Aa6aFbb9932392B9C5BE"; // EVM address
	const testCosmosAddress = "kava1h9ymecpak7wj5qqg2d7gtgr7lcrg4f9w3qkclu"; // Cosmos address

	try {
		console.log("1. Testing EVM Address Balance...");
		const evmAddressData = await KavaModule.getAddress({ address: testEvmAddress });
		console.log("✅ EVM Address Data:", JSON.stringify(evmAddressData, null, 2));

		console.log("\n2. Testing Cosmos Address Balance...");
		const cosmosAddressData = await KavaModule.getAddress({ address: testCosmosAddress });
		console.log("✅ Cosmos Address Data:", JSON.stringify(cosmosAddressData, null, 2));

		console.log("\n3. Testing Token Holdings...");
		const tokens = await KavaModule.getTokens({ address: testEvmAddress }, { show: "10" });
		console.log("✅ Tokens:", JSON.stringify(tokens, null, 2));

		console.log("\n4. Testing Transaction List...");
		const transactions = await KavaModule.getTransactionsList({
			address: testEvmAddress,
			page: "0",
			show: "5",
		});
		console.log("✅ Transactions:", JSON.stringify(transactions, null, 2));

		console.log("\n5. Testing Gas Tracker...");
		const gasTracker = await KavaModule.getGasTracker({});
		console.log("✅ Gas Tracker:", JSON.stringify(gasTracker, null, 2));

		console.log("\n🎉 All Kava integration tests completed successfully!");
	} catch (error) {
		console.error("❌ Test failed:", error.message || "Unknown error");
		console.error("Error details:", error.code || "No error code");
	}
}

// Run the test
testKavaIntegration();
