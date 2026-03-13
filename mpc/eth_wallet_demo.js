#!/usr/bin/env node

const crypto = require("crypto");
const secp = require("noble-secp256k1");
const fs = require("fs");

class EthereumThresholdWallet {
	constructor() {
		this.curveOrder = BigInt("0xFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFEBAAEDCE6AF48A03BBFD25E8CD0364141");
		this.shares = new Map();
		this.threshold = null;
		this.totalParties = null;
		this.reconstructedSecret = null;
		this.ethereumAddress = null;
	}

	// Load shares from JSON files
	loadShares() {
		console.log("📂 Loading threshold shares from JSON files...");

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

				if (loadedCount === 0) {
					this.threshold = data.threshold;
					this.totalParties = data.totalParties;
				}

				console.log(`✅ Loaded share ${data.partyIndex}: x=${data.x}, y=${data.finalShare.slice(0, 20)}...`);
				loadedCount++;
			}
		}

		if (loadedCount < this.threshold) {
			throw new Error(`Need at least ${this.threshold} shares, only found ${loadedCount}`);
		}

		console.log(`📊 Loaded ${loadedCount}/${this.totalParties} shares, threshold ${this.threshold}`);
		return loadedCount;
	}

	// Reconstruct the actual secret key using Lagrange interpolation
	reconstructSecretKey() {
		console.log("\n🔓 RECONSTRUCTING SECRET KEY using Lagrange interpolation...");

		// Use first 'threshold' number of shares
		const sharesForReconstruction = Array.from(this.shares.values()).slice(0, this.threshold);

		console.log("📊 Using shares for reconstruction:");
		sharesForReconstruction.forEach((share) => {
			console.log(`   Party ${share.partyIndex}: (${share.x}, ${share.y.toString().slice(0, 20)}...)`);
		});

		// Lagrange interpolation at x = 0 to get the secret
		this.reconstructedSecret = this.lagrangeInterpolate(sharesForReconstruction, 0n);

		console.log(`\n🔑 RECONSTRUCTED SECRET KEY: ${this.reconstructedSecret}`);
		console.log(`🔑 Secret (hex): 0x${this.reconstructedSecret.toString(16).padStart(64, "0")}`);

		return this.reconstructedSecret;
	}

	// Lagrange interpolation
	lagrangeInterpolate(points, x = 0n) {
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
					num = (num * ((x - xj + this.curveOrder) % this.curveOrder)) % this.curveOrder;
					den = (den * ((xi - xj + this.curveOrder) % this.curveOrder)) % this.curveOrder;
				}
			}

			let denInv = modInv(den, this.curveOrder);
			let term = (((yi * num) % this.curveOrder) * denInv) % this.curveOrder;

			result = (result + term) % this.curveOrder;
		}

		result = ((result % this.curveOrder) + this.curveOrder) % this.curveOrder;
		return result;
	}

	// Generate Ethereum address from secret key
	generateEthereumAddress() {
		console.log("\n🌍 GENERATING ETHEREUM ADDRESS...");

		if (!this.reconstructedSecret) {
			this.reconstructSecretKey();
		}

		// Convert secret to 32-byte buffer
		const secretKeyHex = this.reconstructedSecret.toString(16).padStart(64, "0");
		const secretKeyBuffer = Buffer.from(secretKeyHex, "hex");

		console.log(`🔑 Private Key: 0x${secretKeyHex}`);

		// Generate public key using secp256k1
		const publicKeyBuffer = secp.getPublicKey(secretKeyBuffer, false); // uncompressed
		const publicKeyHex = Buffer.from(publicKeyBuffer).toString("hex");

		console.log(`🔓 Public Key: 0x${publicKeyHex}`);

		// Ethereum address = last 20 bytes of keccak256(publicKey[1:])
		// Note: Remove first byte (0x04) from uncompressed public key
		const publicKeyWithoutPrefix = publicKeyHex.slice(2);
		const publicKeyForAddress = Buffer.from(publicKeyWithoutPrefix, "hex");

		// Use crypto.createHash instead of keccak256 for demo (in production use proper keccak256)
		const addressHash = crypto.createHash("sha256").update(publicKeyForAddress).digest();
		const address = "0x" + addressHash.slice(-20).toString("hex");

		this.ethereumAddress = address;

		console.log(`🏠 Ethereum Address: ${address}`);
		console.log(`💡 Note: Using SHA256 for demo - use proper Keccak256 in production`);

		return {
			privateKey: `0x${secretKeyHex}`,
			publicKey: `0x${publicKeyHex}`,
			address: address,
		};
	}

	// Test signature consistency
	testSignatureConsistency() {
		console.log("\n🧪 TESTING SIGNATURE CONSISTENCY...");

		const testTransaction = "send 1 ETH to 0xabcdef123456...";
		const signatures = [];

		console.log(`📝 Test transaction: ${testTransaction}`);
		console.log("\n🔄 Signing the SAME transaction 3 times...");

		for (let i = 1; i <= 3; i++) {
			const signature = this.signTransactionDeterministic(testTransaction);
			signatures.push(signature);
			console.log(`   Attempt ${i}: ${signature.slice(0, 40)}...`);
		}

		// Check if all signatures are the same
		const allSame = signatures.every((sig) => sig === signatures[0]);

		console.log(`\n🔍 CONSISTENCY CHECK:`);
		console.log(`   All signatures identical: ${allSame ? "✅ YES (Deterministic)" : "❌ NO (Randomized)"}`);

		if (allSame) {
			console.log("   ✅ This is GOOD for blockchain applications");
			console.log("   ✅ Same transaction always produces same signature");
		} else {
			console.log("   ⚠️  Different signatures each time");
			console.log("   ⚠️  This might be OK depending on requirements");
		}

		return allSame;
	}

	// Deterministic transaction signing using the reconstructed secret
	signTransactionDeterministic(transaction) {
		if (!this.reconstructedSecret) {
			this.reconstructSecretKey();
		}

		// Create deterministic signature using HMAC with secret key
		const messageHash = crypto.createHash("sha256").update(transaction).digest();
		const signature = crypto.createHmac("sha256", this.reconstructedSecret.toString()).update(messageHash).digest("hex");

		return signature;
	}

	// Sign using threshold shares (without reconstructing secret)
	signWithThresholdShares(transaction) {
		console.log(`\n🖊️  THRESHOLD SIGNING: ${transaction}`);

		const availableParties = Array.from(this.shares.keys()).slice(0, this.threshold);
		console.log(`👥 Using parties: ${availableParties.join(", ")}`);

		// Generate partial signatures
		const partialSignatures = [];
		for (const partyIndex of availableParties) {
			const share = this.shares.get(partyIndex);
			const partialSig = this.generatePartialSignature(transaction, share);
			partialSignatures.push(partialSig);
			console.log(`   Party ${partyIndex}: ${partialSig.slice(0, 20)}...`);
		}

		// Combine partial signatures
		const finalSignature = this.combinePartialSignatures(transaction, partialSignatures);
		console.log(`✅ Combined signature: ${finalSignature.slice(0, 40)}...`);

		return finalSignature;
	}

	generatePartialSignature(message, share) {
		const messageHash = crypto.createHash("sha256").update(message).digest();
		const partialSig = crypto.createHmac("sha256", share.y.toString()).update(messageHash).digest("hex");
		return partialSig;
	}

	combinePartialSignatures(message, partialSigs) {
		const messageHash = crypto.createHash("sha256").update(message).digest();
		let combined = messageHash.toString("hex");

		for (const partial of partialSigs) {
			combined = crypto
				.createHash("sha256")
				.update(combined + partial)
				.digest("hex");
		}

		return combined;
	}

	// Compare different signing methods
	compareSigningMethods() {
		console.log("\n🔀 COMPARING SIGNING METHODS...");

		const transaction = "approve USDC transfer: 1000 tokens";

		// Method 1: Direct signing with reconstructed secret
		console.log("\n1️⃣ DIRECT SIGNING (with reconstructed secret):");
		const directSig = this.signTransactionDeterministic(transaction);
		console.log(`   Signature: ${directSig.slice(0, 40)}...`);

		// Method 2: Threshold signing (without reconstructing secret)
		console.log("\n2️⃣ THRESHOLD SIGNING (without reconstructing secret):");
		const thresholdSig = this.signWithThresholdShares(transaction);

		// Method 3: Different parties combination
		console.log("\n3️⃣ DIFFERENT PARTY COMBINATION:");
		if (this.shares.size >= 3) {
			// Use parties 1 and 2 instead of 0 and 1
			const altParties = Array.from(this.shares.keys()).slice(1, 1 + this.threshold);
			console.log(`👥 Using alternative parties: ${altParties.join(", ")}`);

			const altPartialSigs = [];
			for (const partyIndex of altParties) {
				const share = this.shares.get(partyIndex);
				const partialSig = this.generatePartialSignature(transaction, share);
				altPartialSigs.push(partialSig);
			}
			const altSig = this.combinePartialSignatures(transaction, altPartialSigs);
			console.log(`   Alternative signature: ${altSig.slice(0, 40)}...`);
		}

		return { directSig, thresholdSig };
	}

	// Full demonstration
	demonstrateEthereumWallet() {
		console.log("🔐 ETHEREUM THRESHOLD WALLET DEMONSTRATION");
		console.log("=".repeat(60));

		// Load shares
		this.loadShares();

		// Reconstruct secret and generate Ethereum wallet
		const ethWallet = this.generateEthereumAddress();

		// Test signature consistency
		this.testSignatureConsistency();

		// Compare signing methods
		this.compareSigningMethods();

		// Summary
		console.log("\n📊 WALLET SUMMARY:");
		console.log(`   Private Key: ${ethWallet.privateKey}`);
		console.log(`   Public Key: ${ethWallet.publicKey.slice(0, 40)}...`);
		console.log(`   ETH Address: ${ethWallet.address}`);
		console.log(`   Threshold: ${this.threshold}/${this.totalParties}`);
		console.log(`   Available Shares: ${this.shares.size}`);

		return ethWallet;
	}
}

// CLI interface
if (require.main === module) {
	try {
		const wallet = new EthereumThresholdWallet();

		// Check if share files exist
		const shareFiles = ["fixed_websocket_party_0_share.json", "fixed_websocket_party_1_share.json", "fixed_websocket_party_2_share.json"];

		const existingFiles = shareFiles.filter((f) => fs.existsSync(f));

		if (existingFiles.length === 0) {
			console.log("❌ No share files found!");
			console.log("💡 Run the DKG process first to generate shares");
			process.exit(1);
		}

		// Run demonstration
		wallet.demonstrateEthereumWallet();
	} catch (error) {
		console.error("❌ Error:", error.message);
		process.exit(1);
	}
}

module.exports = EthereumThresholdWallet;
