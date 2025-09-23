#!/usr/bin/env node

/**
 * Test Runner for Zelf Online Version
 *
 * This script provides an easy way to run the test suite
 * with proper configuration and environment setup.
 */

const { spawn } = require("child_process");
const path = require("path");

// Load environment variables
require("dotenv").config();

// Test configuration
const TEST_CONFIG = {
	timeout: 60000, // 60 seconds
	verbose: true,
	coverage: false,
	watch: false,
	port: process.env.PORT || 3003,
};

// Parse command line arguments
const args = process.argv.slice(2);
const options = {
	watch: args.includes("--watch") || args.includes("-w"),
	coverage: args.includes("--coverage") || args.includes("-c"),
	verbose: args.includes("--verbose") || args.includes("-v"),
	help: args.includes("--help") || args.includes("-h"),
};

if (options.help) {
	console.log(`
Zelf Test Runner

Usage: node test-runner.js [options]

Options:
  -w, --watch     Run tests in watch mode
  -c, --coverage  Generate coverage report
  -v, --verbose   Verbose output
  -h, --help      Show this help message

Examples:
  node test-runner.js                    # Run all tests once
  node test-runner.js --watch            # Run tests in watch mode
  node test-runner.js --coverage         # Run tests with coverage
  node test-runner.js --verbose --watch  # Verbose watch mode
`);
	process.exit(0);
}

// Build Jest command
const jestArgs = ["--testEnvironment=node", "--testTimeout=30000", "--detectOpenHandles", "--forceExit"];

if (options.verbose) {
	jestArgs.push("--verbose");
}

if (options.coverage) {
	jestArgs.push("--coverage");
	jestArgs.push("--coverageDirectory=coverage");
	jestArgs.push("--coverageReporters=text");
	jestArgs.push("--coverageReporters=html");
}

if (options.watch) {
	jestArgs.push("--watch");
}

// Add test files
jestArgs.push("tests/");

console.log("🚀 Starting Zelf Test Suite...");
console.log(`📁 Working directory: ${process.cwd()}`);
console.log(`⚙️  Jest arguments: ${jestArgs.join(" ")}`);
console.log("");

// Check if server is running
const checkServer = () => {
	return new Promise((resolve) => {
		const http = require("http");
		const options = {
			hostname: "localhost",
			port: TEST_CONFIG.port,
			path: "/",
			method: "GET",
			timeout: 5000,
		};

		const req = http.request(options, (res) => {
			console.log(`✅ Server is running on port ${TEST_CONFIG.port}`);
			resolve(true);
		});

		req.on("error", () => {
			console.log(`❌ Server is not running on port ${TEST_CONFIG.port}`);
			console.log("💡 Please start the server first: npm start");
			resolve(false);
		});

		req.on("timeout", () => {
			console.log("⏰ Server check timed out");
			resolve(false);
		});

		req.end();
	});
};

// Run tests
const runTests = async () => {
	const serverRunning = await checkServer();

	if (!serverRunning) {
		console.log("");
		console.log("🔧 To start the server:");
		console.log("   cd /Users/user/zelf-project/zelf-online-version");
		console.log("   npm start");
		console.log("");
		process.exit(1);
	}

	console.log("🧪 Running tests...");
	console.log("");

	const jestProcess = spawn("npx", ["jest", ...jestArgs], {
		stdio: "inherit",
		cwd: process.cwd(),
	});

	jestProcess.on("close", (code) => {
		console.log("");
		if (code === 0) {
			console.log("✅ All tests passed!");
		} else {
			console.log("❌ Some tests failed");
		}
		process.exit(code);
	});

	jestProcess.on("error", (error) => {
		console.error("❌ Failed to run tests:", error.message);
		process.exit(1);
	});
};

// Handle process termination
process.on("SIGINT", () => {
	console.log("\n🛑 Test run interrupted");
	process.exit(0);
});

process.on("SIGTERM", () => {
	console.log("\n🛑 Test run terminated");
	process.exit(0);
});

// Start the test run
runTests().catch((error) => {
	console.error("❌ Test runner error:", error.message);
	process.exit(1);
});
