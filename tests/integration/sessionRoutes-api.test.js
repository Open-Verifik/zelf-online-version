// Session Routes API Integration Tests - Testing Real Running Server
// This test works with the actual running server
const request = require("supertest");
require("dotenv").config();

// Test against the actual running server
const API_BASE_URL = `http://localhost:${process.env.PORT || 3000}`;

describe("Session Routes API Integration Tests - Real Server", () => {
	describe("POST /api/sessions - Create Session", () => {
		it("should create a new session with valid data", async () => {
			const sessionData = {
				identifier: `session_${Date.now()}_${Math.random().toString(36).substring(7)}`,
				type: "createWallet",
				isWebExtension: false,
			};

			const response = await request(API_BASE_URL)
				.post("/api/sessions")
				.set("Origin", "https://test.example.com")
				.send(sessionData)
				.expect(200);

			expect(response.body).toHaveProperty("data");
			expect(response.body.data).toHaveProperty("token");
			expect(response.body.data).toHaveProperty("activatedAt");
			expect(response.body.data).toHaveProperty("expiresAt");
			expect(typeof response.body.data.token).toBe("string");
			expect(typeof response.body.data.activatedAt).toBe("number");
			expect(typeof response.body.data.expiresAt).toBe("number");
		});

		it("should create session with web extension flag", async () => {
			const sessionData = {
				identifier: `session_${Date.now()}_${Math.random().toString(36).substring(7)}`,
				isWebExtension: true,
				type: "decryptWallet",
			};

			const response = await request(API_BASE_URL)
				.post("/api/sessions")
				.set("Origin", "https://test.example.com")
				.send(sessionData)
				.expect(200);

			expect(response.body.data).toHaveProperty("token");
			expect(response.body.data).toHaveProperty("activatedAt");
			expect(response.body.data).toHaveProperty("expiresAt");
		});

		it("should create session with different types", async () => {
			const sessionTypes = ["createWallet", "decryptWallet", "importWallet", "general"];

			for (const type of sessionTypes) {
				const sessionData = {
					identifier: `session_${Date.now()}_${Math.random().toString(36).substring(7)}`,
					type: type,
				};

				const response = await request(API_BASE_URL)
					.post("/api/sessions")
					.set("Origin", "https://test.example.com")
					.send(sessionData)
					.expect(200);

				expect(response.body.data).toHaveProperty("token");
				expect(response.body.data).toHaveProperty("activatedAt");
				expect(response.body.data).toHaveProperty("expiresAt");
			}
		});

		it("should handle missing identifier by using clientIP", async () => {
			const sessionData = {
				type: "createWallet",
			};

			const response = await request(API_BASE_URL)
				.post("/api/sessions")
				.set("Origin", "https://test.example.com")
				.send(sessionData)
				.expect(200);

			expect(response.body).toHaveProperty("data");
			expect(response.body.data).toHaveProperty("token");
			expect(response.body.data).toHaveProperty("activatedAt");
			expect(response.body.data).toHaveProperty("expiresAt");
		});

		it("should include request headers in session creation", async () => {
			const sessionData = {
				identifier: `session_${Date.now()}_${Math.random().toString(36).substring(7)}`,
				type: "general",
			};

			const response = await request(API_BASE_URL)
				.post("/api/sessions")
				.set("Origin", "https://test.example.com")
				.set("User-Agent", "TestAgent/1.0")
				.set("X-Forwarded-For", "192.168.1.1")
				.send(sessionData)
				.expect(200);

			expect(response.body.data).toHaveProperty("token");
			expect(response.body.data).toHaveProperty("activatedAt");
			expect(response.body.data).toHaveProperty("expiresAt");
		});

		it("should generate valid JWT token with correct payload", async () => {
			const sessionData = {
				identifier: `session_${Date.now()}_${Math.random().toString(36).substring(7)}`,
				type: "createWallet",
			};

			const response = await request(API_BASE_URL)
				.post("/api/sessions")
				.set("Origin", "https://test.example.com")
				.send(sessionData)
				.expect(200);

			expect(response.body.data).toHaveProperty("token");
			const token = response.body.data.token;

			// Verify token is a valid JWT format
			expect(token).toMatch(/^[A-Za-z0-9-_]+\.[A-Za-z0-9-_]+\.[A-Za-z0-9-_]+$/);

			// Verify expiration is set correctly (should be 10 minutes from activation)
			const activatedAt = response.body.data.activatedAt;
			const expiresAt = response.body.data.expiresAt;
			const expectedExpiration = activatedAt + 10 * 60; // 10 minutes in seconds

			expect(expiresAt).toBe(expectedExpiration);
		});

		it("should reject requests in production without origin", async () => {
			const sessionData = {
				identifier: `session_${Date.now()}_${Math.random().toString(36).substring(7)}`,
				type: "createWallet",
			};

			const response = await request(API_BASE_URL).post("/api/sessions").send(sessionData).expect(403);

			expect(response.body).toHaveProperty("error", "rejected");
		});
	});

	describe("GET /api/sessions/yek-cilbup - Get Public Key", () => {
		it("should extract public key with valid session identifier", async () => {
			const identifier = `session_${Date.now()}_${Math.random().toString(36).substring(7)}`;

			const response = await request(API_BASE_URL).get("/api/sessions/yek-cilbup").query({ identifier }).expect(200);

			expect(response.body).toHaveProperty("data");
			// The API returns the public key directly as a string
			expect(typeof response.body.data).toBe("string");
			expect(response.body.data).toContain("BEGIN PGP PUBLIC KEY BLOCK");
		});

		it("should extract public key with optional name and email", async () => {
			const identifier = `session_${Date.now()}_${Math.random().toString(36).substring(7)}`;
			const name = "Test User";
			const email = "test@example.com";

			const response = await request(API_BASE_URL).get("/api/sessions/yek-cilbup").query({ identifier, name, email }).expect(200);

			// The API returns the public key directly as a string
			expect(typeof response.body.data).toBe("string");
			expect(response.body.data).toContain("BEGIN PGP PUBLIC KEY BLOCK");
		});

		it("should return validation error for missing identifier", async () => {
			const response = await request(API_BASE_URL).get("/api/sessions/yek-cilbup").expect(409);

			expect(response.body).toHaveProperty("validationError", "missing identifier\n");
		});

		it("should handle empty identifier", async () => {
			const response = await request(API_BASE_URL).get("/api/sessions/yek-cilbup").query({ identifier: "" }).expect(409);

			expect(response.body).toHaveProperty("validationError", "missing identifier\n");
		});
	});

	describe("Session Flow Integration", () => {
		it("should handle complete session workflow", async () => {
			// Step 1: Create a session
			const sessionData = {
				identifier: `session_${Date.now()}_${Math.random().toString(36).substring(7)}`,
				type: "createWallet",
				isWebExtension: false,
			};

			const createResponse = await request(API_BASE_URL)
				.post("/api/sessions")
				.set("Origin", "https://test.example.com")
				.send(sessionData)
				.expect(200);

			expect(createResponse.body.data).toHaveProperty("token");
			expect(createResponse.body.data).toHaveProperty("activatedAt");
			expect(createResponse.body.data).toHaveProperty("expiresAt");

			// Step 2: Extract public key
			const publicKeyResponse = await request(API_BASE_URL)
				.get("/api/sessions/yek-cilbup")
				.query({
					identifier: sessionData.identifier,
					name: "Test User",
					email: "test@example.com",
				})
				.expect(200);

			expect(typeof publicKeyResponse.body.data).toBe("string");
			expect(publicKeyResponse.body.data).toContain("BEGIN PGP PUBLIC KEY BLOCK");
		});

		it("should handle multiple sessions concurrently", async () => {
			const sessions = [];
			const identifiers = [];

			// Create multiple sessions
			for (let i = 0; i < 3; i++) {
				const identifier = `session_${Date.now()}_${i}_${Math.random().toString(36).substring(7)}`;
				const sessionData = {
					identifier: identifier,
					type: "general",
				};

				const response = await request(API_BASE_URL)
					.post("/api/sessions")
					.set("Origin", "https://test.example.com")
					.send(sessionData)
					.expect(200);

				sessions.push(response.body.data);
				identifiers.push(identifier);
			}

			// Verify all sessions were created
			expect(sessions).toHaveLength(3);
			sessions.forEach((session) => {
				expect(session).toHaveProperty("token");
				expect(session).toHaveProperty("activatedAt");
				expect(session).toHaveProperty("expiresAt");
			});

			// Extract public keys for all sessions
			for (let i = 0; i < sessions.length; i++) {
				const response = await request(API_BASE_URL).get("/api/sessions/yek-cilbup").query({ identifier: identifiers[i] }).expect(200);

				expect(typeof response.body.data).toBe("string");
				expect(response.body.data).toContain("BEGIN PGP PUBLIC KEY BLOCK");
			}
		});
	});

	describe("Error Handling", () => {
		it("should handle malformed JSON in create session", async () => {
			const response = await request(API_BASE_URL)
				.post("/api/sessions")
				.set("Content-Type", "application/json")
				.set("Origin", "https://test.example.com")
				.send("invalid json")
				.expect(400);

			// Koa will handle malformed JSON
			expect(response.status).toBe(400);
		});

		it("should handle non-existent routes", async () => {
			// Non-existent routes return 401 (unauthorized) because they're protected
			await request(API_BASE_URL).get("/api/sessions/non-existent").expect(401);
		});

		it("should handle unsupported HTTP methods", async () => {
			// Unsupported methods return 401 (unauthorized) because they're protected
			await request(API_BASE_URL).put("/api/sessions").send({}).expect(401);
		});
	});
});
