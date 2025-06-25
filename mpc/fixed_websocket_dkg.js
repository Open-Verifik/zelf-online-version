const WebSocket = require("ws");
const crypto = require("crypto");
const secp = require("noble-secp256k1");
const fs = require("fs");

class FixedWebSocketDKG {
	constructor(partyIndex, coordinatorUrl = "ws://localhost:8080") {
		this.partyIndex = partyIndex;
		this.coordinatorUrl = coordinatorUrl;
		this.threshold = 2;
		this.totalParties = 3;
		this.curveOrder = BigInt("0xFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFEBAAEDCE6AF48A03BBFD25E8CD0364141");

		// EXACTLY like simple file DKG
		this.polynomial = null;
		this.allPolynomials = new Map();
		this.finalShare = null;
		this.publicKey = null;

		// WebSocket state
		this.ws = null;
		this.sessionId = null;

		this.connect();
	}

	connect() {
		this.ws = new WebSocket(this.coordinatorUrl);

		this.ws.on("open", () => {
			console.log(`Fixed Party ${this.partyIndex} connected to coordinator`);
			this.register();
		});

		this.ws.on("message", (message) => {
			try {
				const data = JSON.parse(message);
				this.handleMessage(data);
			} catch (error) {
				console.error("Error parsing message:", error);
			}
		});

		this.ws.on("close", () => {
			console.log(`Fixed Party ${this.partyIndex} disconnected from coordinator`);
		});

		this.ws.on("error", (error) => {
			console.error(`Fixed Party ${this.partyIndex} connection error:`, error);
		});
	}

	register() {
		this.ws.send(
			JSON.stringify({
				type: "register",
				partyIndex: this.partyIndex,
			})
		);
	}

	handleMessage(data) {
		switch (data.type) {
			case "registered":
				this.sessionId = data.sessionId;
				console.log(`Fixed Party ${this.partyIndex} registered for session ${this.sessionId}`);
				break;

			case "start_dkg":
				console.log(`Fixed Party ${this.partyIndex} starting DKG...`);
				const sessionSeed = data.sessionSeed;
				console.log(`🎲 Using session seed: ${sessionSeed}`);
				this.generatePolynomial(sessionSeed);
				this.sendPolynomial();
				break;

			case "complete_polynomial_set":
				console.log(`Fixed Party ${this.partyIndex} received complete polynomial set`);
				this.loadAllPolynomials(data.allPolynomials);
				this.generateShare();
				break;

			case "error":
				console.error(`Fixed Party ${this.partyIndex} error:`, data.message);
				break;
		}
	}

	// Session-seeded polynomial generation
	generatePolynomial(sessionSeed) {
		console.log(`🎲 Party ${this.partyIndex} generating polynomial with session seed...`);

		// Generate polynomial coefficients using session seed + party index
		this.polynomial = [];
		for (let i = 0; i < this.threshold; i++) {
			// Create deterministic but unique seed for this coefficient
			const seedValue = BigInt(sessionSeed + this.partyIndex * 1000 + i * 100);
			const coeff = seedValue % this.curveOrder;
			this.polynomial.push(coeff);
		}

		console.log(`  Polynomial: [${this.polynomial.map((c) => c.toString()).join(", ")}]`);
	}

	sendPolynomial() {
		// Send polynomial coefficients to coordinator
		const polynomialData = {};
		for (let i = 0; i < this.polynomial.length; i++) {
			polynomialData[i] = this.polynomial[i].toString();
		}

		this.ws.send(
			JSON.stringify({
				type: "dkg_polynomial",
				partyIndex: this.partyIndex,
				polynomial: polynomialData,
			})
		);

		console.log(`Fixed Party ${this.partyIndex} sent polynomial coefficients`);
	}

	// COPIED EXACTLY FROM simple-file-dkg.js
	loadAllPolynomials(allPolynomials) {
		console.log(`📂 Party ${this.partyIndex} loading all polynomials...`);

		for (let i = 0; i < this.totalParties; i++) {
			const polynomial = allPolynomials[i.toString()];
			const coeffs = [];
			for (let j = 0; j < this.threshold; j++) {
				coeffs.push(BigInt(polynomial[j.toString()]));
			}
			this.allPolynomials.set(i, coeffs);
			console.log(`  Party ${i} polynomial: [${coeffs.map((c) => c.toString()).join(", ")}]`);
		}
	}

	// COPIED EXACTLY FROM simple-file-dkg.js
	generateShare() {
		console.log(`🔧 Party ${this.partyIndex} combining polynomials...`);

		// Combine all polynomials
		const combinedPolynomial = new Array(this.threshold).fill(BigInt(0));

		for (const [partyIndex, polynomial] of this.allPolynomials) {
			console.log(`  Adding party ${partyIndex} polynomial: [${polynomial.map((c) => c.toString()).join(", ")}]`);
			for (let i = 0; i < polynomial.length; i++) {
				combinedPolynomial[i] = (combinedPolynomial[i] + polynomial[i]) % this.curveOrder;
			}
		}

		console.log(`  Combined polynomial: [${combinedPolynomial.map((c) => c.toString()).join(", ")}]`);

		// Evaluate at this party's x-coordinate
		const x = this.partyIndex + 1; // 1-based indexing
		this.finalShare = this.evaluatePolynomial(combinedPolynomial, x);

		console.log(`  Final share at x=${x}: ${this.finalShare}`);

		// Generate public key
		this.publicKey = secp.getPublicKey(this.finalShare);

		// Save share
		this.saveShare();

		console.log(`✅ Party ${this.partyIndex} completed DKG`);
		console.log(`🔑 Final share: ${this.finalShare}`);
		console.log(`🔐 Public key: ${Buffer.from(this.publicKey).toString("hex")}`);

		// Notify completion to coordinator
		this.ws.send(
			JSON.stringify({
				type: "dkg_completion",
				partyIndex: this.partyIndex,
			})
		);
	}

	// COPIED EXACTLY FROM simple-file-dkg.js
	evaluatePolynomial(polynomial, x) {
		let result = BigInt(0);

		// Horner's method
		for (let i = polynomial.length - 1; i >= 0; i--) {
			result = (result * BigInt(x) + polynomial[i]) % this.curveOrder;
		}

		return result;
	}

	// COPIED EXACTLY FROM simple-file-dkg.js
	saveShare() {
		const shareData = {
			partyIndex: this.partyIndex,
			threshold: this.threshold,
			totalParties: this.totalParties,
			finalShare: this.finalShare.toString(),
			publicKey: Buffer.from(this.publicKey).toString("hex"),
			x: this.partyIndex + 1,
			timestamp: new Date().toISOString(),
		};

		fs.writeFileSync(`fixed_websocket_party_${this.partyIndex}_share.json`, JSON.stringify(shareData, null, 2));
		console.log(`💾 Saved share to fixed_websocket_party_${this.partyIndex}_share.json`);
	}
}

// CLI interface
if (require.main === module) {
	const args = process.argv.slice(2);
	let partyIndex = null;

	for (let i = 0; i < args.length; i++) {
		if (args[i] === "-index" && i + 1 < args.length) {
			partyIndex = parseInt(args[i + 1]);
		}
	}

	if (partyIndex === null || partyIndex < 0 || partyIndex > 2) {
		console.error("Usage: node fixed_websocket_dkg.js -index <0|1|2>");
		process.exit(1);
	}

	console.log(`Starting Fixed WebSocket DKG Party ${partyIndex}...`);
	const party = new FixedWebSocketDKG(partyIndex);

	process.on("SIGINT", () => {
		console.log(`\nShutting down Fixed WebSocket DKG Party ${partyIndex}...`);
		if (party.ws) {
			party.ws.close();
		}
		process.exit(0);
	});
}

module.exports = FixedWebSocketDKG;
