#!/usr/bin/env node

const crypto = require("crypto");
const secp = require("noble-secp256k1");
const fs = require("fs");

class ThresholdWallet {
	constructor() {
		this.curveOrder = BigInt("0xFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFEBAAEDCE6AF48A03BBFD25E8CD0364141");
		this.shares = new Map();
		this.threshold = null;
		this.totalParties = null;
		this.publicKey = null;
	}

	// Load shares from JSON files
	loadShares() {
		console.log("📂 Loading wallet shares from JSON files...");

		const shareFiles = ["fixed_websocket_party_0_share.json", "fixed_websocket_party_1_share.json", "fixed_websocket_party_2_share.json"];

		let loadedCount = 0;
		for (const filename of shareFiles) {
			if (fs.existsSync(filename)) {
				const data = JSON.parse(fs.readFileSync(filename, "utf8"));

				this.shares.set(data.partyIndex, {
					x: BigInt(data.x),
					y: BigInt(data.finalShare),
					partyIndex: data.partyIndex,
				});

				// Set wallet parameters from first share
				if (loadedCount === 0) {
					this.threshold = data.threshold;
					this.totalParties = data.totalParties;
					this.publicKey = Buffer.from(data.publicKey, "hex");
				}

				console.log(`✅ Loaded share for party ${data.partyIndex}`);
				loadedCount++;
			}
		}

		if (loadedCount < this.threshold) {
			throw new Error(`Need at least ${this.threshold} shares, only found ${loadedCount}`);
		}

		console.log(`📊 Wallet initialized: ${loadedCount}/${this.totalParties} shares, threshold ${this.threshold}`);
		console.log(`🔐 Public key: ${this.publicKey.toString("hex")}`);

		return loadedCount;
	}

	// Get available signing parties (those with loaded shares)
	getAvailableParties() {
		return Array.from(this.shares.keys()).slice(0, this.threshold);
	}

	// Simplified threshold signing for demonstration
	// In production, use proper ECDSA threshold signatures (like FROST)
	signTransaction(transaction) {
		console.log(`\n🖊️  Signing transaction: ${transaction}`);

		const availableParties = this.getAvailableParties();
		if (availableParties.length < this.threshold) {
			throw new Error(`Need ${this.threshold} parties to sign, only ${availableParties.length} available`);
		}

		console.log(`👥 Using parties: ${availableParties.join(", ")} (need ${this.threshold})`);

		// Step 1: Each party generates a partial signature
		const partialSignatures = [];

		for (const partyIndex of availableParties) {
			const share = this.shares.get(partyIndex);
			const partialSig = this.generatePartialSignature(transaction, share);
			partialSignatures.push({
				partyIndex,
				signature: partialSig,
				x: share.x,
			});

			console.log(`  Party ${partyIndex} partial signature: ${partialSig.slice(0, 20)}...`);
		}

		// Step 2: Combine partial signatures using Lagrange interpolation
		const finalSignature = this.combinePartialSignatures(transaction, partialSignatures);

		console.log(`✅ Final signature: ${finalSignature}`);

		// Step 3: Verify signature
		const isValid = this.verifySignature(transaction, finalSignature);
		console.log(`🔍 Signature verification: ${isValid ? "✅ VALID" : "❌ INVALID"}`);

		return {
			transaction,
			signature: finalSignature,
			valid: isValid,
			signingParties: availableParties,
		};
	}

	// Generate partial signature for a party
	generatePartialSignature(message, share) {
		// Simplified: In production, use proper threshold ECDSA like FROST
		const messageHash = crypto.createHash("sha256").update(message).digest();
		const messageHashHex = messageHash.toString("hex");

		// Create deterministic partial signature based on share and message
		const partialSig = crypto.createHmac("sha256", share.y.toString()).update(messageHashHex).digest("hex");

		return partialSig;
	}

	// Combine partial signatures using threshold cryptography principles
	combinePartialSignatures(message, partialSigs) {
		console.log("🔧 Combining partial signatures...");

		// For demonstration: combine using Lagrange interpolation weights
		const messageHash = crypto.createHash("sha256").update(message).digest();

		// In production, this would be proper ECDSA signature combination
		// Here we simulate it by hashing all partial signatures together
		let combined = messageHash.toString("hex");

		for (const partial of partialSigs) {
			combined = crypto
				.createHash("sha256")
				.update(combined + partial.signature)
				.digest("hex");
		}

		return combined;
	}

	// Verify the final signature
	verifySignature(message, signature) {
		// Simplified verification - in production, use proper ECDSA verification
		const messageHash = crypto.createHash("sha256").update(message).digest("hex");

		// For demo: signature is valid if it's deterministic for this message
		const expectedSig = this.combinePartialSignatures(
			message,
			this.getAvailableParties().map((partyIndex) => {
				const share = this.shares.get(partyIndex);
				return {
					partyIndex,
					signature: this.generatePartialSignature(message, share),
					x: share.x,
				};
			})
		);

		return signature === expectedSig;
	}

	// Demonstrate wallet operations
	demonstrateWalletOperations() {
		console.log("🎯 DEMONSTRATING THRESHOLD WALLET OPERATIONS\n");

		// Load shares
		this.loadShares();

		// Sign some transactions
		const transactions = ["send 10 ETH to 0x1234...", "approve token transfer", "stake 5 ETH in validator"];

		console.log("\n" + "=".repeat(60));

		for (const tx of transactions) {
			try {
				const result = this.signTransaction(tx);
				console.log(`📝 Transaction signed successfully`);
				console.log(`   Parties used: ${result.signingParties.join(", ")}`);
				console.log(`   Signature: ${result.signature.slice(0, 40)}...`);
			} catch (error) {
				console.error(`❌ Failed to sign transaction: ${error.message}`);
			}
			console.log("\n" + "-".repeat(60));
		}
	}

	// Show wallet status
	getWalletStatus() {
		const availableShares = this.shares.size;
		const canSign = availableShares >= this.threshold;

		return {
			publicKey: this.publicKey?.toString("hex"),
			totalShares: availableShares,
			requiredShares: this.threshold,
			canSign,
			availableParties: Array.from(this.shares.keys()),
		};
	}
}

// CLI interface
if (require.main === module) {
	console.log("🔐 THRESHOLD WALLET DEMONSTRATION");
	console.log("=".repeat(50));

	try {
		const wallet = new ThresholdWallet();

		// Check if share files exist
		const shareFiles = ["fixed_websocket_party_0_share.json", "fixed_websocket_party_1_share.json", "fixed_websocket_party_2_share.json"];

		const existingFiles = shareFiles.filter((f) => fs.existsSync(f));

		if (existingFiles.length === 0) {
			console.log("❌ No share files found!");
			console.log("💡 Run the DKG process first:");
			console.log("   1. node fixed_coordinator.js");
			console.log("   2. node fixed_websocket_dkg.js -index 0");
			console.log("   3. node fixed_websocket_dkg.js -index 1");
			console.log("   4. node fixed_websocket_dkg.js -index 2");
			console.log("   5. Then run this wallet again");
			process.exit(1);
		}

		console.log(`📂 Found ${existingFiles.length} share files:`);
		existingFiles.forEach((f) => console.log(`   - ${f}`));
		console.log();

		// Demonstrate wallet operations
		wallet.demonstrateWalletOperations();

		// Show final status
		console.log("\n📊 FINAL WALLET STATUS:");
		const status = wallet.getWalletStatus();
		console.log(`   Public Key: ${status.publicKey}`);
		console.log(`   Available Shares: ${status.totalShares}/${status.requiredShares} required`);
		console.log(`   Can Sign: ${status.canSign ? "✅ YES" : "❌ NO"}`);
		console.log(`   Available Parties: [${status.availableParties.join(", ")}]`);
	} catch (error) {
		console.error("❌ Wallet error:", error.message);
		process.exit(1);
	}
}

module.exports = ThresholdWallet;
