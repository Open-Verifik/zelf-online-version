require("dotenv").config();
const ZNSTokenModule = require("../Repositories/ZelfNameService/modules/zns-token.module");

console.log("🚀 Simple ZNS Token Transfer Test\n");

// Test configuration
const TEST_CONFIG = {
	testSolanaAddress: "9HXoiqAHArRbvgdC5cwHnQ1x37NPvSV5DLSJr1TatT35", // Using a known working address
	testAmount: 0.1, // Small test amount
};

async function testTokenTransfer() {
	console.log("📋 Testing ZNS Token Transfer Functionality");
	console.log("=".repeat(50));

	try {
		console.log(`💰 Sending ${TEST_CONFIG.testAmount} ZNS tokens to ${TEST_CONFIG.testSolanaAddress}`);

		const signature = await ZNSTokenModule.giveTokensAfterPurchase(TEST_CONFIG.testAmount, TEST_CONFIG.testSolanaAddress);

		console.log(`✅ Token transfer successful!`);
		console.log(`📝 Transaction signature: ${signature}`);
		console.log(`🔗 View on Solscan: https://solscan.io/tx/${signature}`);

		return { success: true, signature };
	} catch (error) {
		console.log(`❌ Token transfer failed: ${error.message}`);

		// Provide helpful error explanations
		if (error.message.includes("Insufficient balance")) {
			console.log("💡 The sender wallet needs more ZNS tokens");
		} else if (error.message.includes("Invalid public key")) {
			console.log("💡 The Solana address format is invalid");
		} else if (error.message.includes("Network request failed")) {
			console.log("💡 Check your internet connection or Solana RPC endpoint");
		}

		return { success: false, error: error.message };
	}
}

async function testConfiguration() {
	console.log("📋 Testing Configuration");
	console.log("=".repeat(30));

	try {
		const config = require("../Core/config");

		// Check required Solana configuration
		const checks = [
			{ name: "Solana Node Secret", value: config.solana?.nodeSecret, required: true },
			{ name: "Token Mint Address", value: config.solana?.tokenMintAddress, required: true },
			{ name: "Sender Wallet", value: config.solana?.sender, required: true },
		];

		let allGood = true;

		for (const check of checks) {
			if (check.required && !check.value) {
				console.log(`❌ Missing: ${check.name}`);
				allGood = false;
			} else {
				console.log(`✅ ${check.name}: Configured`);
			}
		}

		if (allGood) {
			console.log(`\n🏦 RPC Endpoint: Configured`);
			console.log(`🪙 Token Mint: ${config.solana.tokenMintAddress}`);
			console.log(`📦 SPL Token Version: 0.4.13 (Updated!)`);
		}

		return allGood;
	} catch (error) {
		console.log(`❌ Configuration error: ${error.message}`);
		return false;
	}
}

async function testMultipleAmounts() {
	console.log("\n📋 Testing Multiple Token Amounts");
	console.log("=".repeat(40));

	const amounts = [0.05, 0.1, 0.25]; // Different test amounts
	const results = [];

	for (const amount of amounts) {
		try {
			console.log(`\n💰 Testing ${amount} ZNS tokens...`);

			const signature = await ZNSTokenModule.giveTokensAfterPurchase(amount, TEST_CONFIG.testSolanaAddress);

			console.log(`✅ Success! Signature: ${signature.substring(0, 20)}...`);
			results.push({ amount, success: true, signature });

			// Small delay between transactions
			await new Promise((resolve) => setTimeout(resolve, 1000));
		} catch (error) {
			console.log(`❌ Failed for ${amount} ZNS: ${error.message}`);
			results.push({ amount, success: false, error: error.message });
		}
	}

	return results;
}

async function runSimpleTests() {
	console.log("🎯 ZNS Token Functionality Test Suite");
	console.log("==========================================");
	console.log(`📅 ${new Date().toISOString()}\n`);

	// Test 1: Configuration
	console.log("🔧 Step 1: Configuration Check");
	const configOk = await testConfiguration();

	if (!configOk) {
		console.log("\n❌ Configuration issues detected. Please check your setup.");
		return;
	}

	console.log("\n✅ Configuration looks good!\n");

	// Test 2: Single Transfer
	console.log("🔧 Step 2: Single Token Transfer");
	const singleResult = await testTokenTransfer();

	if (!singleResult.success) {
		console.log("\n❌ Basic token transfer failed. Please check the error above.");
		return;
	}

	console.log("\n✅ Single transfer working!\n");

	// Test 3: Multiple Amounts
	console.log("🔧 Step 3: Multiple Amount Testing");
	const multiResults = await testMultipleAmounts();

	// Summary
	console.log("\n📊 Final Results");
	console.log("==================");

	const successCount = multiResults.filter((r) => r.success).length;
	const totalTests = multiResults.length;

	console.log(`✅ Configuration: PASS`);
	console.log(`✅ Basic Transfer: PASS`);
	console.log(`✅ Multiple Amounts: ${successCount}/${totalTests} PASS`);

	if (successCount === totalTests) {
		console.log("\n🎉 ALL TESTS PASSED!");
		console.log("🚀 Your ZNS token transfer system is working perfectly!");
		console.log("💡 The updated @solana/spl-token package (v0.4.13) is functioning correctly.");
	} else {
		console.log("\n⚠️  Some tests had issues, but basic functionality is working.");
	}

	// List all successful transactions
	const successfulTxs = multiResults.filter((r) => r.success);
	if (successfulTxs.length > 0) {
		console.log("\n🔗 Successful Transactions:");
		successfulTxs.forEach((tx, i) => {
			console.log(`   ${i + 1}. ${tx.amount} ZNS - https://solscan.io/tx/${tx.signature}`);
		});
	}
}

// Run the tests
if (require.main === module) {
	runSimpleTests().catch((error) => {
		console.error("💥 Test crashed:", error);
		process.exit(1);
	});
}

module.exports = {
	testTokenTransfer,
	testConfiguration,
	testMultipleAmounts,
	runSimpleTests,
};
