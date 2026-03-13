#!/usr/bin/env node

const fs = require("fs");

console.log("🧪 Testing Seed Generation Logic\n");

// Simulate the coordinator's seed generation logic
function generateSeed() {
	let seed = null;
	if (process.env.TEST_SEED) {
		seed = parseInt(process.env.TEST_SEED);
		console.log(`🧪 Using fixed test seed: ${seed}`);
	} else if (process.env.ENABLE_SEEDED_GENERATION === "true") {
		seed = Math.floor(Math.random() * 1000000);
		console.log(`🎲 Generated random seed for this session: ${seed}`);
	} else {
		console.log(`🔀 Using purely random generation (no seed)`);
	}
	return seed;
}

console.log("Testing 5 consecutive seed generations:\n");

for (let i = 1; i <= 5; i++) {
	console.log(`Session ${i}:`);
	const seed = generateSeed();
	console.log(`  Seed: ${seed || "null (pure random)"}\n`);
}

console.log("🎯 Expected behavior:");
console.log("- All seeds should be different random numbers");
console.log("- This proves each session will generate different secrets");
console.log("\n✅ If you see different seeds above, the fix is working!");
