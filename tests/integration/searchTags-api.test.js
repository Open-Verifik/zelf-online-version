// Search Tags API Integration Tests - Testing Real Running Server
// This test works with the actual running server on port 3003
const request = require("supertest");

// Test against the actual running server
const API_BASE_URL = "http://localhost:3003";

describe("Search Tags API Integration Tests - Real Server", () => {
	let authToken;

	// Create a session and get JWT token before running tests
	beforeAll(async () => {
		const sessionData = {
			identifier: `search_test_session_${Date.now()}_${Math.random().toString(36).substring(7)}`,
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

	describe("GET /api/tags/search - Search Tag", () => {
		it("should search for an existing tag and return tag data", async () => {
			const searchParams = {
				tagName: "migueltrevino",
				domain: "zelf",
				os: "DESKTOP",
			};

			const response = await request(API_BASE_URL)
				.get("/api/tags/search")
				.set("Origin", "https://test.example.com")
				.set("Authorization", `Bearer ${authToken}`)
				.query(searchParams);

			expect(response.status).toBe(200);
			expect(response.body).toHaveProperty("data");

			// If tag is found (available: false)
			if (!response.body.data.available) {
				expect(response.body.data).toHaveProperty("tagObject");
				expect(response.body.data.tagObject).toHaveProperty("publicData");
				expect(response.body.data.tagObject).toHaveProperty("zelfProofQRCode");
			}
		});

		it("should search for a non-existing tag and return pricing information", async () => {
			const searchParams = {
				tagName: `nonexistent${Date.now()}.zelf`,
				domain: "zelf",
				os: "DESKTOP",
			};

			const response = await request(API_BASE_URL)
				.get("/api/tags/search")
				.set("Origin", "https://test.example.com")
				.set("Authorization", `Bearer ${authToken}`)
				.query(searchParams);

			expect(response.status).toBe(200);
			expect(response.body).toHaveProperty("data");

			// If tag is not found (available: true)
			if (response.body.data.available) {
				expect(response.body.data).toHaveProperty("price");
				expect(response.body.data.price).toHaveProperty("price");
				expect(response.body.data.price).toHaveProperty("reward");
				expect(response.body.data.price).toHaveProperty("discount");
				expect(response.body.data.price).toHaveProperty("discountType");
			}
		});

		it("should return pricing for different duration options", async () => {
			const searchParams = {
				tagName: `durationtest${Date.now()}.zelf`,
				domain: "zelf",
				os: "DESKTOP",
				duration: "lifetime",
			};

			const response = await request(API_BASE_URL)
				.get("/api/tags/search")
				.set("Origin", "https://test.example.com")
				.set("Authorization", `Bearer ${authToken}`)
				.query(searchParams);

			expect(response.status).toBe(200);
			expect(response.body).toHaveProperty("data");

			if (response.body.data.available) {
				expect(response.body.data).toHaveProperty("price");
				expect(response.body.data.price).toHaveProperty("price");
			}
		});

		it("should return validation error when required parameters are missing", async () => {
			const searchParams = {
				// tagName, key, and value are intentionally missing
				domain: "zelf",
				os: "DESKTOP",
			};

			const response = await request(API_BASE_URL)
				.get("/api/tags/search")
				.set("Origin", "https://test.example.com")
				.set("Authorization", `Bearer ${authToken}`)
				.query(searchParams);

			expect(response.status).toBe(409);
			expect(response.body).toHaveProperty("validationError");
			expect(response.body.validationError).toContain("missing tagName or key or value");
		});

		it("should return unauthorized error when JWT token is missing", async () => {
			const searchParams = {
				tagName: "migueltrevino",
				domain: "zelf",
				os: "DESKTOP",
			};

			const response = await request(API_BASE_URL)
				.get("/api/tags/search")
				.set("Origin", "https://test.example.com")
				// Authorization header is intentionally missing
				.query(searchParams);

			expect(response.status).toBe(401);
			expect(response.body).toHaveProperty("error");
		});

		it("should search for tag in different domains (avax)", async () => {
			const searchParams = {
				tagName: `avaxuser${Date.now()}.avax`,
				domain: "avax",
				os: "DESKTOP",
			};

			const response = await request(API_BASE_URL)
				.get("/api/tags/search")
				.set("Origin", "https://test.example.com")
				.set("Authorization", `Bearer ${authToken}`)
				.query(searchParams);

			console.log("should search for tag in different domains (avax)", { response: response.body });

			expect(response.status).toBe(200);
			expect(response.body).toHaveProperty("data");
		});

		it("should return validation error for BDAG domain name length", async () => {
			const searchParams = {
				tagName: `bdaguser${Date.now()}.bdag`,
				domain: "bdag",
				os: "DESKTOP",
			};

			const response = await request(API_BASE_URL)
				.get("/api/tags/search")
				.set("Origin", "https://test.example.com")
				.set("Authorization", `Bearer ${authToken}`)
				.query(searchParams);

			expect(response.status).toBe(409);
			expect(response.body).toHaveProperty("validationError");
			expect(response.body.validationError).toContain("20 characters");
		});
	});
});
