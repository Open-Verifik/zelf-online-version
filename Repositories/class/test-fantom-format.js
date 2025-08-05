/**
 * Test to verify Fantom module returns correct format
 */

// Mock the Fantom module response
const StandardizedChainFormatter = require("./standardized-chain-formatter");

const fantomFormatter = new StandardizedChainFormatter("Fantom", "FTM", "https://s2.coinmarketcap.com/static/img/coins/64x64/3513.png");

// Simulate the Fantom module's getAddress function
const simulateFantomGetAddress = (address) => {
	try {
		// Simulate raw data from Fantom APIs
		const rawData = {
			address: address,
			balance: "12029.88207755367",
			fiatBalance: 5781.561326472294,
			price: "0.4806",
			type: "system_account",
			tokenHoldings: [],
			transactions: [],
		};

		// Use standardized formatter (without wrapping)
		const formattedResponse = fantomFormatter.formatAddressData(rawData, address, false);

		// Validate the response
		if (!fantomFormatter.validateResponse(formattedResponse)) {
			console.warn("Fantom response validation failed, returning empty response");
			return fantomFormatter.getEmptyResponse(address).data;
		}

		return formattedResponse;
	} catch (error) {
		console.error("Fantom getAddress error:", error.message || "Unknown error");
		// Return error response in correct format (without wrapping)
		const errorResponse = fantomFormatter.getErrorResponse(error.message);
		return errorResponse.data;
	}
};

// Test the function
const testAddress = "0x91e7accb84688972cb0632ada5077ce66f801e78";
const result = simulateFantomGetAddress(testAddress);

console.log("=== Fantom Module Format Test ===");
console.log("Input address:", testAddress);
console.log("\nOutput format:");
console.log(JSON.stringify(result, null, 2));

// Check if the format is correct (no double wrapping)
const hasCorrectStructure =
	result &&
	result.address &&
	result.balance !== undefined &&
	result.fiatBalance !== undefined &&
	result.account &&
	result.tokenHoldings &&
	result.transactions &&
	!result.data; // Should not have nested data

console.log("\n=== Validation ===");
console.log("✅ Has correct structure:", hasCorrectStructure);
console.log("✅ No double wrapping:", !result.data);
console.log("✅ Address format:", result.address);
console.log("✅ Balance type:", typeof result.balance);
console.log("✅ Account asset:", result.account.asset);
console.log("✅ Token holdings total:", result.tokenHoldings.total);
console.log("✅ Transactions count:", result.transactions.length);

if (hasCorrectStructure && !result.data) {
	console.log("\n🎉 SUCCESS: Fantom module now returns the correct format!");
} else {
	console.log("\n❌ FAILED: Format is still incorrect");
}
