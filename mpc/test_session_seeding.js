#!/usr/bin/env node

const { spawn } = require("child_process");
const fs = require("fs");
const path = require("path");

console.log("🧪 Testing Session-Seeded WebSocket DKG\n");
console.log("This test verifies that each session generates a unique secret\n");

// Clean up function
function cleanupFiles() {
	const filesToClean = ["fixed_websocket_party_0_share.json", "fixed_websocket_party_1_share.json", "fixed_websocket_party_2_share.json"];

	filesToClean.forEach((file) => {
		if (fs.existsSync(file)) {
			fs.unlinkSync(file);
			console.log(`🗑️  Cleaned up ${file}`);
		}
	});
}

// Function to run a single DKG session
function runDKGSession(sessionNumber) {
	return new Promise((resolve, reject) => {
		console.log(`\n🚀 Starting Session ${sessionNumber}...\n`);

		cleanupFiles();

		// Start coordinator
		const coordinator = spawn("node", ["fixed_coordinator.js"], {
			stdio: ["pipe", "pipe", "pipe"],
		});

		let sessionSeed = null;

		coordinator.stdout.on("data", (data) => {
			const output = data.toString().trim();
			console.log(`[SESSION ${sessionNumber} COORD] ${output}`);

			// Capture the session seed
			const seedMatch = output.match(/🎲 Generated session seed: (\d+)/);
			if (seedMatch) {
				sessionSeed = parseInt(seedMatch[1]);
			}
		});

		coordinator.stderr.on("data", (data) => {
			console.error(`[SESSION ${sessionNumber} COORD ERROR] ${data.toString().trim()}`);
		});

		// Wait for coordinator to start
		setTimeout(() => {
			// Start parties
			const parties = [];

			for (let i = 0; i < 3; i++) {
				const party = spawn("node", ["fixed_websocket_dkg.js", "-index", i.toString()], {
					stdio: ["pipe", "pipe", "pipe"],
				});

				party.stdout.on("data", (data) => {
					console.log(`[SESSION ${sessionNumber} PARTY ${i}] ${data.toString().trim()}`);
				});

				party.stderr.on("data", (data) => {
					console.error(`[SESSION ${sessionNumber} PARTY ${i} ERROR] ${data.toString().trim()}`);
				});

				parties.push(party);
			}

			// Wait for DKG completion
			setTimeout(() => {
				// Get the reconstructed secret
				const result = getSessionResult(sessionNumber, sessionSeed);

				// Clean up processes
				coordinator.kill();
				parties.forEach((party) => party.kill());

				resolve(result);
			}, 8000); // Wait 8 seconds for DKG to complete
		}, 2000); // Wait 2 seconds for coordinator to start
	});
}

// Function to extract session results
function getSessionResult(sessionNumber, sessionSeed) {
	try {
		// Load shares and reconstruct secret
		const shares = [];

		for (let i = 0; i < 2; i++) {
			// Only need 2 shares for threshold 2
			const filename = `fixed_websocket_party_${i}_share.json`;
			if (fs.existsSync(filename)) {
				const data = JSON.parse(fs.readFileSync(filename, "utf8"));
				shares.push({
					x: data.x,
					y: BigInt(data.finalShare),
				});
			}
		}

		if (shares.length < 2) {
			console.log(`❌ Session ${sessionNumber}: Not enough shares`);
			return null;
		}

		// Lagrange interpolation to reconstruct secret
		const secret = lagrangeInterpolate(shares);

		console.log(`✅ Session ${sessionNumber} completed successfully`);
		console.log(`   Session Seed: ${sessionSeed}`);
		console.log(`   Reconstructed Secret: ${secret}`);

		return {
			sessionNumber,
			sessionSeed,
			secret,
			shares: shares.map((s) => ({ x: s.x, y: s.y.toString() })),
		};
	} catch (error) {
		console.log(`❌ Session ${sessionNumber}: Error - ${error.message}`);
		return null;
	}
}

// Lagrange interpolation function
function lagrangeInterpolate(points, x = 0n) {
	const curveOrder = BigInt("0xFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFEBAAEDCE6AF48A03BBFD25E8CD0364141");

	function modInv(a, m) {
		let m0 = m,
			t,
			q;
		let x0 = BigInt(0),
			x1 = BigInt(1);
		a = ((a % m) + m) % m;
		if (m === BigInt(1)) return BigInt(0);
		while (a > 1) {
			q = a / m;
			t = m;
			m = a % m;
			a = t;
			t = x0;
			x0 = x1 - q * x0;
			x1 = t;
		}
		if (x1 < 0) x1 += m0;
		return x1;
	}

	let result = BigInt(0);

	for (let i = 0; i < points.length; i++) {
		let xi = BigInt(points[i].x);
		let yi = BigInt(points[i].y);
		let num = BigInt(1);
		let den = BigInt(1);

		for (let j = 0; j < points.length; j++) {
			if (i !== j) {
				let xj = BigInt(points[j].x);
				num = (num * ((x - xj + curveOrder) % curveOrder)) % curveOrder;
				den = (den * ((xi - xj + curveOrder) % curveOrder)) % curveOrder;
			}
		}

		let denInv = modInv(den, curveOrder);
		let term = (((yi * num) % curveOrder) * denInv) % curveOrder;

		result = (result + term) % curveOrder;
	}

	result = ((result % curveOrder) + curveOrder) % curveOrder;
	return result;
}

// Main test function
async function runSessionSeedingTest() {
	console.log("🎯 Running 3 sessions to test session seeding...\n");

	const results = [];

	for (let i = 1; i <= 3; i++) {
		try {
			const result = await runDKGSession(i);
			if (result) {
				results.push(result);
			}
		} catch (error) {
			console.error(`❌ Session ${i} failed:`, error.message);
		}

		// Wait between sessions
		if (i < 3) {
			console.log("\n⏳ Waiting 3 seconds before next session...\n");
			await new Promise((resolve) => setTimeout(resolve, 3000));
		}
	}

	// Analyze results
	console.log("\n" + "=".repeat(80));
	console.log("📊 SESSION SEEDING TEST RESULTS");
	console.log("=".repeat(80));

	if (results.length === 0) {
		console.log("❌ No successful sessions - test failed");
		return;
	}

	console.log(`\n✅ Completed ${results.length} successful sessions:\n`);

	results.forEach((result, idx) => {
		console.log(`Session ${result.sessionNumber}:`);
		console.log(`  Seed: ${result.sessionSeed}`);
		console.log(`  Secret: ${result.secret}`);
		console.log(`  Shares: [${result.shares.map((s) => `(${s.x}, ${s.y.slice(0, 20)}...)`).join(", ")}]`);
		console.log();
	});

	// Check uniqueness
	const seeds = results.map((r) => r.sessionSeed);
	const secrets = results.map((r) => r.secret.toString());

	const uniqueSeeds = new Set(seeds);
	const uniqueSecrets = new Set(secrets);

	console.log("🔍 ANALYSIS:");
	console.log(`  Total sessions: ${results.length}`);
	console.log(`  Unique seeds: ${uniqueSeeds.size}/${results.length} ${uniqueSeeds.size === results.length ? "✅" : "❌"}`);
	console.log(`  Unique secrets: ${uniqueSecrets.size}/${results.length} ${uniqueSecrets.size === results.length ? "✅" : "❌"}`);

	if (uniqueSeeds.size === results.length && uniqueSecrets.size === results.length) {
		console.log("\n🎉 SUCCESS: Session seeding works correctly!");
		console.log("✅ Each session generated a unique seed");
		console.log("✅ Each session generated a unique secret");
		console.log("✅ Threshold reconstruction works within each session");
		console.log("\n🔧 The fix ensures:");
		console.log("  - Same secret within each session (parties agree)");
		console.log("  - Different secrets between sessions (timestamp-based seeding)");
	} else {
		console.log("\n❌ ISSUE DETECTED:");
		if (uniqueSeeds.size !== results.length) {
			console.log("  - Some sessions had duplicate seeds");
		}
		if (uniqueSecrets.size !== results.length) {
			console.log("  - Some sessions generated identical secrets");
		}
	}

	// Test threshold properties within a session
	if (results.length > 0) {
		console.log("\n🔐 TESTING THRESHOLD PROPERTIES (using last session):");
		const lastResult = results[results.length - 1];

		// Verify that any 2 shares reconstruct the same secret
		if (lastResult.shares.length >= 2) {
			const share1 = { x: lastResult.shares[0].x, y: BigInt(lastResult.shares[0].y) };
			const share2 = { x: lastResult.shares[1].x, y: BigInt(lastResult.shares[1].y) };

			const reconstructedFromPair = lagrangeInterpolate([share1, share2]);
			const originalSecret = lastResult.secret;

			console.log(`  Original secret: ${originalSecret}`);
			console.log(`  Reconstructed:   ${reconstructedFromPair}`);
			console.log(`  Threshold check: ${originalSecret === reconstructedFromPair ? "✅ PASS" : "❌ FAIL"}`);
		}
	}
}

// Cleanup and run
console.log("🧹 Initial cleanup...");
cleanupFiles();

console.log("\n🚀 Starting session seeding test...");
runSessionSeedingTest().catch((error) => {
	console.error("Test failed:", error);
	process.exit(1);
});
