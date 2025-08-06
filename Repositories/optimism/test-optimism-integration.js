/**
 * OP Mainnet (Optimism) Integration Test
 *
 * This file tests the core functionality of the OP Mainnet blockchain integration
 * to ensure OKLink API integration works correctly.
 */

const {
	getAddress,
	getTokens,
	getTransactionsList,
	getTransactionStatus,
	getGasTracker,
	getPortfolioSummary,
} = require("./modules/optimism-scrapping.module");

// Test address - OP Mainnet address (Uniswap V3 on Optimism)
const TEST_ADDRESS = "0x68b3465833fb72A70ecDF485E0e4C7bD8665Fc45"; // Uniswap V3 Router on Optimism

async function testOptimismIntegration() {
	console.log("🚀 Starting OP Mainnet Integration Test...\n");

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
		console.log("💡 Note: Optimism gas prices are typically very low!");
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
		console.log("✅ OP Mainnet integration is working correctly with OKLink API");
		console.log("🚀 Optimism's low gas fees make it perfect for frequent transactions!");
	} catch (error) {
		console.error("❌ Test failed:", error.message);
		console.error("Stack trace:", error.stack);
		process.exit(1);
	}
}

// Run the test if this file is executed directly
if (require.main === module) {
	testOptimismIntegration();
}

module.exports = {
	testOptimismIntegration,
};
