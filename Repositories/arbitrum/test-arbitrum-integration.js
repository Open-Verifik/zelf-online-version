/**
 * Arbitrum One Integration Test
 *
 * This file tests the core functionality of the Arbitrum One blockchain integration
 * to ensure OKLink API integration works correctly.
 */

const {
	getAddress,
	getTokens,
	getTransactionsList,
	getTransactionStatus,
	getGasTracker,
	getPortfolioSummary,
} = require("./modules/arbitrum-scrapping.module");

// Test address - Arbitrum One mainnet address
const TEST_ADDRESS = "0x1f9840a85d5aF5bf1D1762F925BDADdC4201F984"; // UNI token contract on Arbitrum

async function testArbitrumIntegration() {
	console.log("🚀 Starting Arbitrum One Integration Test...\n");

	try {
		// Test 1: Get Address Information
		console.log("📍 Test 1: Getting address information...");
		const addressInfo = await getAddress({ address: TEST_ADDRESS });
		console.log("✅ Address Info:", {
			address: addressInfo.address,
			balance: addressInfo.balance,
			tokenCount: addressInfo.tokenHoldings?.total || 0,
			transactionCount: addressInfo.transactions?.length || 0,
		});
		console.log("");

		// Test 2: Get Token Holdings
		console.log("🪙 Test 2: Getting token holdings...");
		const tokens = await getTokens({ address: TEST_ADDRESS }, { show: "10" });
		console.log("✅ Token Holdings:", {
			totalTokens: tokens.total,
			totalFiatBalance: tokens.totalFiatBalance,
			sampleTokens:
				tokens.tokens?.slice(0, 3).map((t) => ({
					symbol: t.symbol,
					name: t.name,
					balance: t.amount,
				})) || [],
		});
		console.log("");

		// Test 3: Get Transaction List
		console.log("📋 Test 3: Getting transaction list...");
		const transactions = await getTransactionsList({
			address: TEST_ADDRESS,
			page: "0",
			show: "5",
		});
		console.log("✅ Transactions:", {
			totalRecords: transactions.pagination?.records || "0",
			transactionCount: transactions.transactions?.length || 0,
			source: transactions.source || "unknown",
			sampleTx: transactions.transactions?.[0]
				? {
						hash: transactions.transactions[0].hash,
						from: transactions.transactions[0].from,
						to: transactions.transactions[0].to,
						method: transactions.transactions[0].method,
				  }
				: null,
		});
		console.log("");

		// Test 4: Get Gas Tracker
		console.log("⛽ Test 4: Getting gas tracker...");
		const gasTracker = await getGasTracker({});
		console.log("✅ Gas Tracker:", {
			safeLow: gasTracker.SafeLow,
			standard: gasTracker.Standard,
			fast: gasTracker.Fast,
			fastest: gasTracker.Fastest,
		});
		console.log("");

		// Test 5: Get Portfolio Summary
		console.log("💼 Test 5: Getting portfolio summary...");
		const portfolio = await getPortfolioSummary({ address: TEST_ADDRESS });
		console.log("✅ Portfolio Summary:", {
			totalValue: portfolio.totalPortfolioValue,
			ethBalance: portfolio.ethBalance,
			ethValue: portfolio.ethValue,
			tokenCount: portfolio.tokenCount,
			lastUpdated: portfolio.lastUpdated,
		});
		console.log("");

		console.log("🎉 All tests completed successfully!");
		console.log("✅ Arbitrum One integration is working correctly with OKLink API");
	} catch (error) {
		console.error("❌ Test failed:", error.message);
		console.error("Stack trace:", error.stack);
		process.exit(1);
	}
}

// Run the test if this file is executed directly
if (require.main === module) {
	testArbitrumIntegration();
}

module.exports = {
	testArbitrumIntegration,
};
