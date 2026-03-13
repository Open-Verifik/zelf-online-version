// Preview Tags API Integration Tests - Testing Real Running Server
// This test works with the actual running server
const request = require("supertest");
require("dotenv").config();

// Test against the actual running server
const API_BASE_URL = `http://localhost:${process.env.PORT || 3000}`;

describe("Preview Tags API Integration Tests - Real Server", () => {
	let authToken;

	// Create a session and get JWT token before running tests
	beforeAll(async () => {
		const sessionData = {
			identifier: `preview_test_session_${Date.now()}_${Math.random().toString(36).substring(7)}`,
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

	describe("GET /api/tags/preview - Preview Tag", () => {
		it("should preview an existing tag with full data", async () => {
			const previewData = {
				tagName: `migueltrevino`,
				domain: "zelf",
				os: "DESKTOP",
			};

			const response = await request(API_BASE_URL)
				.get("/api/tags/preview")
				.set("Origin", "https://test.example.com")
				.set("Authorization", `Bearer ${authToken}`)
				.query(previewData);

			expect(response.body).toHaveProperty("data");
			expect(response.body.data).toHaveProperty("preview");
			expect(response.body.data).toHaveProperty("tagObject");

			// Check preview object structure
			expect(response.body.data.preview).toHaveProperty("passwordLayer");
			expect(response.body.data.preview).toHaveProperty("publicData");
			expect(response.body.data.preview).toHaveProperty("requireLiveness");

			// Check tagObject structure
			expect(response.body.data.tagObject).toHaveProperty("id");
			expect(response.body.data.tagObject).toHaveProperty("owner");
			expect(response.body.data.tagObject).toHaveProperty("url");
			expect(response.body.data.tagObject).toHaveProperty("explorerUrl");
			expect(response.body.data.tagObject).toHaveProperty("publicData");
			expect(response.body.data.tagObject).toHaveProperty("size");
			expect(response.body.data.tagObject).toHaveProperty("zelfProofQRCode");
			expect(response.body.data.tagObject).toHaveProperty("zelfProof");
		});

		it("should preview an available tag with pricing data", async () => {
			const previewData = {
				tagName: `migueltrevino2`,
				domain: "zelf",
				os: "DESKTOP",
			};

			const response = await request(API_BASE_URL)
				.get("/api/tags/preview")
				.set("Origin", "https://test.example.com")
				.set("Authorization", `Bearer ${authToken}`)
				.query(previewData);

			expect(response.body).toHaveProperty("data");
			expect(response.body.data).toHaveProperty("ipfs");
			expect(response.body.data).toHaveProperty("arweave");
			expect(response.body.data).toHaveProperty("available");
			expect(response.body.data).toHaveProperty("tagName");
			expect(response.body.data).toHaveProperty("price");

			// Check price object structure
			expect(response.body.data.price).toHaveProperty("price");
			expect(response.body.data.price).toHaveProperty("currency");
			expect(response.body.data.price).toHaveProperty("reward");
			expect(response.body.data.price).toHaveProperty("discount");
			expect(response.body.data.price).toHaveProperty("priceWithoutDiscount");
			expect(response.body.data.price).toHaveProperty("discountType");

			// Verify it's available for purchase
			expect(response.body.data.available).toBe(true);
		});

		it("should return validation error when tagName is missing", async () => {
			const previewData = {
				// tagName is intentionally missing
				domain: "bdag",
				os: "DESKTOP",
			};

			const response = await request(API_BASE_URL)
				.get("/api/tags/preview")
				.set("Origin", "https://test.example.com")
				.set("Authorization", `Bearer ${authToken}`)
				.query(previewData);

			expect(response.status).toBe(409);
			expect(response.body).toHaveProperty("validationError");
			expect(response.body.validationError).toContain("tagName");
		});

		it("should return validation error when domain is missing", async () => {
			const previewData = {
				tagName: `t${Date.now().toString().slice(-6)}`,
				// domain is intentionally missing
				os: "DESKTOP",
			};

			const response = await request(API_BASE_URL)
				.get("/api/tags/preview")
				.set("Origin", "https://test.example.com")
				.set("Authorization", `Bearer ${authToken}`)
				.query(previewData);

			expect(response.status).toBe(409);
			expect(response.body).toHaveProperty("validationError");
			expect(response.body.validationError).toContain("domain");
		});

		it("should return validation error when os is missing", async () => {
			const previewData = {
				tagName: `t${Date.now().toString().slice(-6)}`,
				domain: "bdag",
				// os is intentionally missing
			};

			const response = await request(API_BASE_URL)
				.get("/api/tags/preview")
				.set("Origin", "https://test.example.com")
				.set("Authorization", `Bearer ${authToken}`)
				.query(previewData);

			expect(response.status).toBe(409);
			expect(response.body).toHaveProperty("validationError");
			expect(response.body.validationError).toContain("os");
		});

		it("should return unauthorized error when JWT token is missing", async () => {
			const previewData = {
				tagName: `t${Date.now().toString().slice(-6)}`,
				domain: "bdag",
				os: "DESKTOP",
			};

			const response = await request(API_BASE_URL)
				.get("/api/tags/preview")
				.set("Origin", "https://test.example.com")
				// Authorization header is intentionally missing
				.query(previewData);

			expect(response.status).toBe(401);
			expect(response.body).toHaveProperty("error");
		});

		it("should handle different domain types", async () => {
			const domains = ["zelf", "avax", "bdag"];

			for (const domain of domains) {
				const previewData = {
					tagName: `t${Date.now().toString().slice(-6)}${domain}`,
					domain: domain,
					os: "DESKTOP",
				};

				const response = await request(API_BASE_URL)
					.get("/api/tags/preview")
					.set("Origin", "https://test.example.com")
					.set("Authorization", `Bearer ${authToken}`)
					.query(previewData);

				expect(response.status).toBe(200);
				expect(response.body.data).toHaveProperty("tagName");
				expect(response.body.data).toHaveProperty("available");

				// Should have either preview data (existing tag) or price data (available tag)
				if (response.body.data.available) {
					expect(response.body.data).toHaveProperty("price");
				} else {
					expect(response.body.data).toHaveProperty("preview");
					expect(response.body.data).toHaveProperty("tagObject");
				}
			}
		});

		it("should handle different OS types", async () => {
			const osTypes = ["DESKTOP", "ANDROID", "IOS"];

			for (const os of osTypes) {
				const previewData = {
					tagName: `t${Date.now().toString().slice(-6)}${os}`,
					domain: "bdag",
					os: os,
				};

				const response = await request(API_BASE_URL)
					.get("/api/tags/preview")
					.set("Origin", "https://test.example.com")
					.set("Authorization", `Bearer ${authToken}`)
					.query(previewData);

				expect(response.status).toBe(200);
				expect(response.body.data).toHaveProperty("tagName");
				expect(response.body.data).toHaveProperty("available");

				// Should have either preview data (existing tag) or price data (available tag)
				if (response.body.data.available) {
					expect(response.body.data).toHaveProperty("price");
				} else {
					expect(response.body.data).toHaveProperty("preview");
					expect(response.body.data).toHaveProperty("tagObject");
				}
			}
		});
	});
});
