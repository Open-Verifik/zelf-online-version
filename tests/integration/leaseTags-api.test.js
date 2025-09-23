// Lease Tags API Integration Tests - Testing Real Running Server
// This test works with the actual running server on port 3003
const request = require("supertest");

// Test against the actual running server
const API_BASE_URL = "http://localhost:3003";

const sampleFaceFromJSON = require("../../config/0012589021.json");

describe("Lease Tags API Integration Tests - Real Server", () => {
	let authToken;

	// Create a session and get JWT token before running tests
	beforeAll(async () => {
		const sessionData = {
			identifier: `lease_test_session_${Date.now()}_${Math.random().toString(36).substring(7)}`,
			type: "createWallet",
			isWebExtension: false,
		};

		const sessionResponse = await request(API_BASE_URL)
			.post("/api/sessions")
			.set("Origin", "https://test.example.com")
			.send(sessionData)
			.expect(200);

		authToken = sessionResponse.body.data.token;
		expect(authToken).toBeDefined();
	});

	describe("POST /api/tags/lease - Lease Tag", () => {
		it("should lease a tag with valid data", async () => {
			const leaseData = {
				tagName: `test${Date.now()}`,
				domain: "avax",
				duration: "yearly",
				paymentMethod: "coinbase",
				currency: "USD",
				faceBase64: sampleFaceFromJSON.faceBase64,
				password: sampleFaceFromJSON.password,
				type: "create",
				os: "DESKTOP",
				referralTagName: "",
				removePGP: true,
			};

			const response = await request(API_BASE_URL)
				.post("/api/tags/lease")
				.set("Origin", "https://test.example.com")
				.set("Authorization", `Bearer ${authToken}`)
				.send(leaseData);

			expect(response.body).toHaveProperty("data");

			expect(response.body.data).toHaveProperty("avaxName");
			expect(response.body.data).toHaveProperty("ethAddress");
			expect(response.body.data).toHaveProperty("solanaAddress");
			expect(response.body.data).toHaveProperty("btcAddress");
			expect(response.body.data).toHaveProperty("avaxName");
			expect(response.body.data).toHaveProperty("domain");
			expect(response.body.data).toHaveProperty("zelfProofQRCode");
			expect(response.body.data).toHaveProperty("zelfProof");
		});
	});
});
