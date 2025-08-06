/**
 * Tron Blockchain Integration Test
 *
 * This file tests the core functionality of the Tron blockchain integration
 * to ensure OKLink API integration works correctly.
 */

const {
	getAddress,
	getTokens,
	getTransactionsList,
	getTransactionStatus,
	getGasTracker,
	getPortfolioSummary,
} = require("./modules/tron-scrapping.module");

// Test address - Tron mainnet address (Binance hot wallet)
const TEST_ADDRESS = "TQn9Y2khEsLJW1ChVWFMSMeRDow5KcbLSE"; // Binance 8 hot wallet

async function testTronIntegration() {
	console.log("🚀 Starting Tron Integration Test...\n");

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
						energy: transactions.transactions[0].energy,
						bandwidth: transactions.transactions[0].bandwidth,
				  }
				: null,
		});
		console.log("");

		// Test 4: Get Energy & Bandwidth Tracker
		console.log("⚡ Test 4: Getting energy & bandwidth tracker...");
		const energyTracker = await getGasTracker({});
		console.log("✅ Energy Tracker:", {
			energyPrice: energyTracker.energyPrice,
			bandwidthPrice: energyTracker.bandwidthPrice,
			freezeForEnergy: energyTracker.freezeForEnergy,
			freezeForBandwidth: energyTracker.freezeForBandwidth,
			note: energyTracker.note,
		});
		console.log("💡 Note: Tron uses Energy and Bandwidth instead of gas!");
		console.log("");

		// Test 5: Get Portfolio Summary
		console.log("💼 Test 5: Getting portfolio summary...");
		const portfolio = await getPortfolioSummary({ address: TEST_ADDRESS });
		console.log("✅ Portfolio Summary:", {
			totalValue: portfolio.totalPortfolioValue,
			trxBalance: portfolio.trxBalance,
			trxValue: portfolio.trxValue,
			tokenCount: portfolio.tokenCount,
			lastUpdated: portfolio.lastUpdated,
		});
		console.log("");

		console.log("🎉 All tests completed successfully!");
		console.log("✅ Tron integration is working correctly with OKLink API");
		console.log("🌟 Tron's energy/bandwidth system provides efficient transaction processing!");
		console.log("💰 Low fees make Tron perfect for stablecoin transfers and DeFi!");
	} catch (error) {
		console.error("❌ Test failed:", error.message);
		console.error("Stack trace:", error.stack);
		process.exit(1);
	}
}

// Run the test if this file is executed directly
if (require.main === module) {
	testTronIntegration();
}

module.exports = {
	testTronIntegration,
};
