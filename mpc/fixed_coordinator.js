const WebSocket = require("ws");

class FixedCoordinator {
	constructor(port = 8080) {
		this.port = port;
		this.parties = new Map();
		this.polynomials = new Map();
		this.completedParties = new Set();
		this.threshold = 2;
		this.totalParties = 3;
		this.sessionId = `fixed_dkg_${Date.now()}`;

		this.setupWebSocket();
		console.log(`Fixed Coordinator running on ws://localhost:${port}`);
		console.log(`Session ID: ${this.sessionId}`);
	}

	setupWebSocket() {
		this.wss = new WebSocket.Server({ port: this.port });

		this.wss.on("connection", (ws) => {
			console.log("New WebSocket connection established");

			ws.on("message", (message) => {
				try {
					const data = JSON.parse(message);
					this.handleMessage(ws, data);
				} catch (error) {
					console.error("Error parsing message:", error);
				}
			});

			ws.on("close", () => {
				console.log("WebSocket connection closed");
			});
		});

		console.log(`Fixed Coordinator started on port ${this.port}`);
	}

	handleMessage(ws, data) {
		switch (data.type) {
			case "register":
				this.registerParty(ws, data);
				break;

			case "dkg_polynomial":
				this.handleDKGPolynomial(ws, data);
				break;

			case "dkg_completion":
				this.handleDKGCompletion(ws, data);
				break;

			default:
				console.log(`Unknown message type: ${data.type}`);
		}
	}

	registerParty(ws, data) {
		const partyIndex = data.partyIndex;
		if (this.parties.has(partyIndex)) {
			ws.send(JSON.stringify({ type: "error", message: "Party index already taken" }));
			return;
		}

		this.parties.set(partyIndex, { ws, index: partyIndex });
		console.log(`Party ${partyIndex} registered`);

		ws.send(
			JSON.stringify({
				type: "registered",
				partyIndex,
				sessionId: this.sessionId,
				threshold: this.threshold,
				totalParties: this.totalParties,
			})
		);

		if (this.parties.size === this.totalParties) {
			console.log("All parties registered. Starting DKG...");
			this.startDKG();
		}
	}

	startDKG() {
		console.log(`Starting Fixed DKG session ${this.sessionId}`);

		// Generate unique session seed based on timestamp
		const sessionSeed = Date.now();
		console.log(`🎲 Generated session seed: ${sessionSeed}`);

		this.broadcast({
			type: "start_dkg",
			sessionId: this.sessionId,
			sessionSeed: sessionSeed,
			threshold: this.threshold,
			totalParties: this.totalParties,
		});
	}

	handleDKGPolynomial(ws, data) {
		const partyIndex = data.partyIndex;
		console.log(`Coordinator received polynomial from party ${partyIndex}`);

		// Store polynomial
		this.polynomials.set(partyIndex, data.polynomial);

		console.log(`  Polynomial from party ${partyIndex}: [${Object.values(data.polynomial).join(", ")}]`);

		// Check if all parties have sent polynomials
		if (this.polynomials.size === this.totalParties) {
			console.log("✅ All parties have sent polynomials");
			this.distributePolynomials();
		} else {
			console.log(`⏳ Waiting for more polynomials: ${this.polynomials.size}/${this.totalParties}`);
		}
	}

	distributePolynomials() {
		// Create the complete set of all polynomials
		const allPolynomials = {};
		for (const [partyIndex, polynomial] of this.polynomials) {
			allPolynomials[partyIndex] = polynomial;
		}

		console.log("🔄 Broadcasting complete polynomial set to all parties...");
		console.log(`📊 Complete set contains polynomials from: ${Object.keys(allPolynomials).join(", ")}`);

		this.broadcast({
			type: "complete_polynomial_set",
			allPolynomials: allPolynomials,
		});

		console.log("✅ All parties received complete polynomial set");
	}

	handleDKGCompletion(ws, data) {
		const partyIndex = data.partyIndex;
		console.log(`Party ${partyIndex} completed DKG`);
		this.completedParties.add(partyIndex);

		if (this.completedParties.size === this.totalParties) {
			console.log("🎉 All parties completed Fixed DKG successfully!");
		}
	}

	broadcast(message) {
		for (const party of this.parties.values()) {
			const messageStr = typeof message === "string" ? message : JSON.stringify(message);
			party.ws.send(messageStr);
		}
	}
}

// Start the coordinator
if (require.main === module) {
	const coordinator = new FixedCoordinator();

	process.on("SIGINT", () => {
		console.log("\nShutting down Fixed coordinator...");
		coordinator.wss.close();
		process.exit(0);
	});
}

module.exports = FixedCoordinator;
