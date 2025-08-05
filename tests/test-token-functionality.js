require("dotenv").config();
const ZNSTokenModule = require("../Repositories/ZelfNameService/modules/zns-token.module");
const RewardsModule = require("../Repositories/Rewards/modules/rewards.module");
const DatabaseModule = require("../Core/database");

// Test configuration
const TEST_CONFIG = {
	testSolanaAddress: "9HXoiqAHArRbvgdC5cwHnQ1x37NPvSV5DLSJr1TatT35", // Replace with a real Solana address for testing
	testZelfName: "jumitrmo.zelf", // Replace with a real ZelfName that has a Solana address
	testAmount: 0.5, // Test amount in ZNS tokens
};

const mongooseConnection = DatabaseModule.initMongoDB();

mongooseConnection.on("error", (err) => {
	console.error("DB connection error :::", err);

	process.exit(1);
});

mongooseConnection.once("open", async () => {
	console.log("Connected MongoDB");

	console.log("🚀 Starting ZNS Token Functionality Tests...\n");

	runTests().catch((error) => {
		console.error("💥 Test runner crashed:", error);
		process.exit(1);
	});
});

// Test 1: Direct Token Transfer
async function testDirectTokenTransfer() {
	console.log("📋 Test 1: Direct Token Transfer");
	console.log("=".repeat(50));

	try {
		if (!TEST_CONFIG.testSolanaAddress) {
			console.log("⚠️  Please set a valid testSolanaAddress in the TEST_CONFIG");
			return false;
		}

		console.log(`💰 Attempting to send ${TEST_CONFIG.testAmount} ZNS tokens to ${TEST_CONFIG.testSolanaAddress}`);

		const signature = await ZNSTokenModule.giveTokensAfterPurchase(TEST_CONFIG.testAmount, TEST_CONFIG.testSolanaAddress);

		console.log(`✅ Token transfer successful!`);
		console.log(`📝 Transaction signature: ${signature}`);
		console.log(`🔗 View on Solscan: https://solscan.io/tx/${signature}`);

		return true;
	} catch (error) {
		console.log(`❌ Token transfer failed: ${error.message}`);
		console.log(`🔍 Error details:`, error);
		return false;
	}
}

// Test 2: Daily Rewards System
async function testDailyRewards() {
	console.log("\n📋 Test 2: Daily Rewards System");
	console.log("=".repeat(50));

	try {
		if (!TEST_CONFIG.testZelfName || TEST_CONFIG.testZelfName === "test.hold") {
			console.log("⚠️  Please set a valid testZelfName in the TEST_CONFIG");
			return false;
		}

		console.log(`🎁 Attempting to claim daily reward for ${TEST_CONFIG.testZelfName}`);

		const result = await RewardsModule.dailyRewards(
			{ zelfName: TEST_CONFIG.testZelfName },
			{} // authUser - might need to be populated based on your auth system
		);

		console.log(`✅ Daily rewards processed!`);
		console.log(`🎉 Success: ${result.success}`);
		console.log(`💰 Reward amount: ${result.reward?.amount || 0} ZNS`);
		console.log(`🏷️  ZelfName type: ${result.reward?.zelfNameType || "N/A"}`);
		console.log(`🔗 Token transfer status: ${result.tokenTransferStatus || "failed"}`);

		if (result.tokenTransfer?.signature) {
			console.log(`📝 Transaction signature: ${result.tokenTransfer.signature}`);
			console.log(`🔗 View on Solscan: https://solscan.io/tx/${result.tokenTransfer.signature}`);
		}

		console.log(`💬 Message: ${result.message}`);

		return true;
	} catch (error) {
		console.log(`❌ Daily rewards failed: ${error.message}`);
		console.log(`🔍 Error details:`, error);
		return false;
	}
}

// Test 3: Configuration Validation
async function testConfiguration() {
	console.log("\n📋 Test 3: Configuration Validation");
	console.log("=".repeat(50));

	const config = require("../Core/config");

	console.log("🔍 Checking Solana configuration...");

	if (!config.solana?.nodeSecret) {
		console.log("❌ Missing config.solana.nodeSecret");
		return false;
	}

	if (!config.solana?.tokenMintAddress) {
		console.log("❌ Missing config.solana.tokenMintAddress");
		return false;
	}

	if (!config.solana?.sender) {
		console.log("❌ Missing config.solana.sender");
		return false;
	}

	console.log("✅ Solana configuration looks good");
	console.log(`🏦 Node URL: https://flashy-ultra-choice.solana-mainnet.quiknode.pro/${config.solana.nodeSecret}/`);
	console.log(`🪙 Token Mint: ${config.solana.tokenMintAddress}`);
	console.log(`👤 Sender wallet configured: ✅`);

	return true;
}

// Main test runner
async function runTests() {
	console.log("🔧 ZNS Token Transfer & Daily Rewards Test Suite");
	console.log("=".repeat(60));
	console.log(`📅 Test run: ${new Date().toISOString()}`);
	console.log(`🌐 Environment: ${process.env.NODE_ENV || "development"}\n`);

	const results = {
		configuration: false,
		directTransfer: false,
		dailyRewards: false,
	};

	// Test configuration first
	results.configuration = await testConfiguration();

	if (!results.configuration) {
		console.log("\n❌ Configuration test failed. Please check your environment variables.");
		process.exit(1);
	}

	// Test direct token transfer
	console.log("\n⏳ Running direct token transfer test...");
	results.directTransfer = await testDirectTokenTransfer();

	// Test daily rewards system
	console.log("\n⏳ Running daily rewards test...");
	results.dailyRewards = await testDailyRewards();

	// Summary
	console.log("\n📊 Test Results Summary");
	console.log("=".repeat(50));
	console.log(`✅ Configuration: ${results.configuration ? "PASS" : "FAIL"}`);
	console.log(`✅ Direct Transfer: ${results.directTransfer ? "PASS" : "FAIL"}`);
	console.log(`✅ Daily Rewards: ${results.dailyRewards ? "PASS" : "FAIL"}`);

	const passedTests = Object.values(results).filter(Boolean).length;
	const totalTests = Object.keys(results).length;

	console.log(`\n🎯 Overall: ${passedTests}/${totalTests} tests passed`);

	if (passedTests === totalTests) {
		console.log("🎉 All tests passed! ZNS token functionality is working correctly.");
	} else {
		console.log("⚠️  Some tests failed. Please check the errors above.");
	}
}

module.exports = {
	runTests,
	testDirectTokenTransfer,
	testDailyRewards,
	testConfiguration,
	TEST_CONFIG,
};
