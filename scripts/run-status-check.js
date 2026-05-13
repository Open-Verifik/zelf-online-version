#!/usr/bin/env node
/**
 * Status Check Runner
 *
 * Runs integration test suites and saves each individual test result
 * as its own document in MongoDB — one record per endpoint per run.
 *
 * Usage:
 *   PORT=3050 node scripts/run-status-check.js
 *   PORT=3050 node scripts/run-status-check.js --suite=zelf-ids
 *   PORT=3050 node scripts/run-status-check.js --suite=all
 *
 * Environment:
 *   PORT              — API server port (required, must match running server)
 *   MONGODB_URI       — MongoDB connection string
 *   STATUS_ENV        — Environment label (default: "production")
 */
require("dotenv").config();

const { execSync } = require("child_process");
const path = require("path");
const mongoose = require("mongoose");
const DatabaseModule = require("../Core/database");
const StatusModule = require("../Repositories/Status/modules/status-check.module");

// ── Test suite registry ─────────────────────────────────────────────────
const TEST_SUITES = {
	"zelf-ids": {
		testFile: "tests/integration/zelf-ids-api.test.js",
		config: "jest.integration.http.config.js",
	},
	blogs: {
		testFile: "tests/integration/blogs-api.test.js",
		config: "jest.integration.http.config.js",
	},
	"zelf-keys": {
		testFile: "tests/integration/zelf-keys-api.test.js",
		config: "jest.integration.http.config.js",
	},
};

// ── Parse CLI args ──────────────────────────────────────────────────────
const args = process.argv.slice(2);
const suiteArg = args.find((a) => a.startsWith("--suite="))?.split("=")[1] || "all";
const environment = process.env.STATUS_ENV || "production";
const rootDir = path.resolve(__dirname, "..");

/**
 * Run a single test suite and return Jest JSON output
 */
const runSuite = (suiteName, suiteConfig) => {
	const { testFile, config } = suiteConfig;
	const cmd = `npx jest --config ${config} ${testFile} --json --no-coverage 2>/dev/null`;

	console.log(`\n🧪 Running suite: ${suiteName}`);
	console.log(`   Command: ${cmd}`);

	try {
		const output = execSync(cmd, {
			cwd: rootDir,
			encoding: "utf-8",
			timeout: 120_000,
			env: { ...process.env },
		});

		return JSON.parse(output);
	} catch (error) {
		// Jest exits with code 1 when tests fail — stdout still has JSON
		if (error.stdout) {
			try {
				return JSON.parse(error.stdout);
			} catch {
				// JSON parse failed
			}
		}

		throw new Error(`Suite "${suiteName}" crashed: ${error.message}`);
	}
};

/**
 * Main runner
 */
const main = async () => {
	console.log("═══════════════════════════════════════════════");
	console.log("  Status Check Runner");
	console.log(`  Environment: ${environment}`);
	console.log(`  Port: ${process.env.PORT || 3000}`);
	console.log(`  Time: ${new Date().toISOString()}`);
	console.log("═══════════════════════════════════════════════");

	// Connect to MongoDB
	const connection = DatabaseModule.initMongoDB();

	await new Promise((resolve, reject) => {
		connection.on("error", reject);
		connection.once("open", resolve);
	});

	console.log("✅ Connected to MongoDB");

	// Determine which suites to run
	const suitesToRun =
		suiteArg === "all"
			? Object.entries(TEST_SUITES)
			: TEST_SUITES[suiteArg]
				? [[suiteArg, TEST_SUITES[suiteArg]]]
				: [];

	if (suitesToRun.length === 0) {
		console.error(`❌ Unknown suite: "${suiteArg}". Available: ${Object.keys(TEST_SUITES).join(", ")}`);
		process.exit(1);
	}

	const summary = [];

	for (const [suiteName, suiteConfig] of suitesToRun) {
		try {
			const jestResults = runSuite(suiteName, suiteConfig);

			const result = await StatusModule.saveTestResults({
				suite: suiteName,
				environment,
				jestResults,
			});

			const icon = result.failed === 0 ? "✅" : "❌";
			console.log(`${icon} ${suiteName}: ${result.passed}/${result.total} passed`);
			console.log(`   Run ID: ${result.runId}`);
			console.log(`   Records saved: ${result.records.length}`);

			// Log each individual endpoint
			for (const r of result.records) {
				const testIcon = r.status === "passed" ? "  ✅" : "  ❌";
				console.log(`${testIcon} ${r.httpMethod} ${r.path} (${r.duration}ms)`);
			}

			summary.push({
				suite: suiteName,
				status: result.failed === 0 ? "pass" : "fail",
				passed: result.passed,
				failed: result.failed,
				total: result.total,
				runId: result.runId,
			});
		} catch (error) {
			console.error(`💥 ${suiteName}: ${error.message}`);

			const result = await StatusModule.saveRunnerError({
				suite: suiteName,
				environment,
				errorMessage: error.message,
			});

			summary.push({
				suite: suiteName,
				status: "error",
				passed: 0,
				failed: 1,
				total: 1,
				runId: result.runId,
			});
		}
	}

	// Print summary
	console.log("\n═══════════════════════════════════════════════");
	console.log("  Summary");
	console.log("═══════════════════════════════════════════════");

	for (const s of summary) {
		const icon = s.status === "pass" ? "✅" : s.status === "fail" ? "❌" : "💥";
		console.log(`  ${icon} ${s.suite}: ${s.status} (${s.passed}/${s.total}) — run: ${s.runId}`);
	}

	const allPass = summary.every((s) => s.status === "pass");
	console.log(`\n  Overall: ${allPass ? "✅ ALL PASS" : "⚠️  ISSUES DETECTED"}`);
	console.log("═══════════════════════════════════════════════\n");

	await mongoose.disconnect();
	process.exit(allPass ? 0 : 1);
};

main().catch((error) => {
	console.error("💥 Runner failed:", error.message);
	mongoose.disconnect().finally(() => process.exit(1));
});
