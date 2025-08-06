/**
 * Test the Fantom module with a real address that's timing out in Postman
 */

const config = require("../../Core/config");
const axios = require("axios");

console.log("=== Testing API Key Configuration ===");
console.log("OKLink API Key exists:", !!config.oklink?.apiKey);
console.log("OKLink API Key length:", config.oklink?.apiKey?.length || 0);
console.log();

// SonicScan APIs are currently unreachable, skipping tests
console.log("=== SonicScan APIs Status ===");
console.log("❌ SonicScan APIs are unreachable (DNS issues)");
console.log("✅ Using QuickNode RPC for basic data");
console.log();

// Test the Fantom module with better error handling
const Module = require("../fantom/modules/fantom-scrapping.module");

const testAddress = "0x8e1701cfd85258ddb8dfe89bc4c7350822b9601d";

console.log("\n=== Testing Real Sonic Address ===");
console.log("Address:", testAddress);
console.log();

(async () => {
	try {
		console.log("🔄 Fetching address data...");
		const startTime = Date.now();

		// Add a timeout to prevent hanging
		const timeoutPromise = new Promise((_, reject) => {
			setTimeout(() => reject(new Error("Request timeout after 30 seconds")), 30000);
		});

		const dataPromise = Module.getAddress({ address: testAddress });

		const result = await Promise.race([dataPromise, timeoutPromise]);

		const endTime = Date.now();
		const duration = endTime - startTime;

		console.log(`✅ Request completed in ${duration}ms`);
		console.log("\n=== Result ===");
		console.log(JSON.stringify(result, null, 2));

		// Check if we have data
		const hasTokens = result.tokenHoldings && result.tokenHoldings.total > 0;
		const hasTransactions = result.transactions && result.transactions.length > 0;

		console.log("\n=== Summary ===");
		console.log("✅ Has tokens:", hasTokens, `(${result.tokenHoldings?.total || 0} tokens)`);
		console.log("✅ Has transactions:", hasTransactions, `(${result.transactions?.length || 0} transactions)`);
		console.log("✅ Response time:", duration + "ms");
	} catch (error) {
		console.error("❌ Error:", error.message);
		if (error.stack) console.error("Stack:", error.stack);
	}
})();
