/**
 * Walrus Client Diagnostic Script
 *
 * This script helps diagnose why the Walrus client is not initializing
 * Usage: node diagnose-walrus-client.js
 */

const path = require("path");
const fs = require("fs");

async function diagnoseWalrusClient() {
	console.log("🔍 Walrus Client Diagnostic Report");
	console.log("=".repeat(50));

	// Check 1: Dependencies
	console.log("\n1️⃣ Checking Dependencies");
	console.log("-".repeat(30));

	const packageJsonPath = path.join(__dirname, "../../package.json");
	let packageJson = {};

	try {
		if (fs.existsSync(packageJsonPath)) {
			packageJson = JSON.parse(fs.readFileSync(packageJsonPath, "utf8"));
		}

		const walrusDep = packageJson.dependencies?.["@mysten/walrus"] || packageJson.devDependencies?.["@mysten/walrus"];
		const suiDep = packageJson.dependencies?.["@mysten/sui"] || packageJson.devDependencies?.["@mysten/sui"];

		console.log(`📦 @mysten/walrus: ${walrusDep || "❌ Not found"}`);
		console.log(`📦 @mysten/sui: ${suiDep || "❌ Not found"}`);

		if (!walrusDep) {
			console.log("⚠️  Missing @mysten/walrus dependency");
			console.log("   Fix: npm install @mysten/walrus");
		}

		if (!suiDep) {
			console.log("⚠️  Missing @mysten/sui dependency");
			console.log("   Fix: npm install @mysten/sui");
		}
	} catch (error) {
		console.log(`❌ Error reading package.json: ${error.message}`);
	}

	// Check 2: Module imports
	console.log("\n2️⃣ Checking Module Imports");
	console.log("-".repeat(30));

	try {
		const { getFullnodeUrl, SuiClient } = require("@mysten/sui/client");
		console.log("✅ @mysten/sui/client imported successfully");

		const { Ed25519Keypair } = require("@mysten/sui/keypairs/ed25519");
		console.log("✅ @mysten/sui/keypairs/ed25519 imported successfully");

		const { WalrusClient } = require("@mysten/walrus");
		console.log("✅ @mysten/walrus imported successfully");
	} catch (error) {
		console.log(`❌ Module import failed: ${error.message}`);
		console.log("   This is likely why the Walrus client is not available");

		if (error.message.includes("Cannot find module")) {
			console.log("   Fix: npm install @mysten/walrus @mysten/sui");
		}
	}

	// Check 3: Manual initialization test
	console.log("\n3️⃣ Manual Initialization Test");
	console.log("-".repeat(30));

	try {
		const { getFullnodeUrl, SuiClient } = require("@mysten/sui/client");
		const { WalrusClient } = require("@mysten/walrus");

		// Test Sui client
		console.log("📡 Testing Sui client initialization...");
		const suiClient = new SuiClient({
			url: getFullnodeUrl("mainnet"),
		});
		console.log("✅ Sui client initialized successfully");

		// Test Walrus client
		console.log("🗂️  Testing Walrus client initialization...");
		const walrusClient = new WalrusClient({
			network: "mainnet",
			suiClient,
			storageNodeClientOptions: {
				timeout: 45000,
				onError: (error) => {
					console.log(`   Storage node error during init: ${error.message}`);
				},
			},
		});
		console.log("✅ Walrus client initialized successfully");

		// Test basic connectivity
		console.log("🌐 Testing basic connectivity...");
		try {
			// This might fail but should give us more info
			await walrusClient.readBlob({ blobId: "fSWx7-xmJKC7L7JqWKGngAVrYtkwkZ8hhvY1IK3fNxI" });
		} catch (testError) {
			console.log(`   Expected test error: ${testError.message}`);
		}
	} catch (initError) {
		console.log(`❌ Initialization failed: ${initError.message}`);
		console.log(`   Error type: ${initError.constructor.name}`);
		console.log(`   Stack: ${initError.stack?.split("\n")[0] || "None"}`);

		if (initError.message.includes("mainnet")) {
			console.log("   💡 Mainnet support might not be fully available yet");
			console.log("   Try switching to testnet temporarily");
		}
	}

	// Check 4: Environment
	console.log("\n4️⃣ Environment Check");
	console.log("-".repeat(30));

	console.log(`📍 Current directory: ${process.cwd()}`);
	console.log(`🌍 Node.js version: ${process.version}`);
	console.log(`🌐 Platform: ${process.platform}`);
	console.log(`📦 NPM version: ${process.env.npm_version || "Unknown"}`);

	// Check if we're in the right directory
	const expectedPaths = ["zelf-online-version/Repositories/Walrus/modules/walrus.module.js", "package.json", "node_modules"];

	const missingPaths = expectedPaths.filter((p) => !fs.existsSync(p));
	if (missingPaths.length > 0) {
		console.log(`⚠️  Missing expected files/directories: ${missingPaths.join(", ")}`);
		console.log("   Make sure you're running from the project root directory");
	}

	// Check 5: Configuration
	console.log("\n5️⃣ Configuration Check");
	console.log("-".repeat(30));

	try {
		const config = require("../../Core/config");
		console.log("✅ Config loaded successfully");

		if (config.walrus) {
			console.log("✅ Walrus config section exists");
			console.log(`   Private key configured: ${config.walrus.privateKey ? "Yes" : "No"}`);
		} else {
			console.log("⚠️  No Walrus config section found");
		}
	} catch (configError) {
		console.log(`❌ Config error: ${configError.message}`);
	}

	// Check 6: Network connectivity
	console.log("\n6️⃣ Network Connectivity Check");
	console.log("-".repeat(30));

	try {
		const axios = require("axios");

		// Test Sui RPC
		console.log("📡 Testing Sui mainnet RPC...");
		const suiResponse = await axios.get("https://fullnode.mainnet.sui.io:443", { timeout: 10000 });
		console.log("✅ Sui mainnet RPC accessible");
	} catch (networkError) {
		console.log(`❌ Network test failed: ${networkError.message}`);
		console.log("   This might affect Walrus client initialization");
	}

	// Final recommendations
	console.log("\n🎯 Recommendations");
	console.log("=".repeat(50));

	console.log("Based on this diagnosis:");
	console.log("");
	console.log("If dependencies are missing:");
	console.log("  npm install @mysten/walrus @mysten/sui");
	console.log("");
	console.log("If initialization fails:");
	console.log("  - Walrus mainnet support might not be fully available yet");
	console.log("  - Try switching to testnet in the configuration");
	console.log("  - Check network connectivity");
	console.log("");
	console.log("If your actual code works but scripts don't:");
	console.log("  - Different Node.js contexts or environments");
	console.log("  - Different working directories");
	console.log("  - Different dependency versions");
	console.log("");
	console.log("Next steps:");
	console.log("1. Fix any missing dependencies");
	console.log("2. Try running from the correct directory");
	console.log("3. Check if your actual code runs in a different environment");
	console.log("4. Consider using testnet temporarily if mainnet is unstable");
}

// Run the diagnostic
if (require.main === module) {
	diagnoseWalrusClient().catch(console.error);
}

module.exports = { diagnoseWalrusClient };
