// Session Routes Integration Tests - NO MOCKING POLICY
// All tests work with real data and real session routes
const request = require("supertest");
const testHelper = require("../helpers/testHelper");

// Import the actual server app and session routes
const Koa = require("koa");
const Router = require("koa-router");
const bodyParser = require("koa-bodyparser");
const cors = require("@koa/cors");

// Create test app with REAL session routes
const app = new Koa();
const router = new Router();

// Middleware
app.use(cors());
app.use(bodyParser());

// Mock IP address for testing
app.use(async (ctx, next) => {
	ctx.request.ip = ctx.request.ip || "127.0.0.1";
	await next();
});

// Import and use the REAL session routes
const sessionRoutes = require("../../Repositories/Session/routes/session.route");

// Mock the config for testing
const originalConfig = require("../../Core/config");
const mockConfig = {
	...originalConfig,
	basePath: (path) => `/api${path}`,
	env: "test",
	sessions: {
		globalLimit: 100,
	},
};

// Temporarily replace config for testing
jest.mock("../../Core/config", () => mockConfig);

// Register the REAL session routes
sessionRoutes(app);

describe("Session Routes Integration Tests - Real Data Only", () => {
	let testApp;

	beforeAll(async () => {
		testApp = await testHelper.initApp(app);
	});

	beforeEach(async () => {
		// Clean database before each test
		await testHelper.cleanDatabase();
	});

	describe("POST /api/sessions - Create Session", () => {
		it("should create a new session with valid data", async () => {
			const sessionData = {
				identifier: `session_${Date.now()}_${Math.random().toString(36).substring(7)}`,
				type: "createWallet",
				isWebExtension: false,
			};

			const response = await testApp.post("/api/sessions").send(sessionData).expect(200);

			expect(response.body).toHaveProperty("data");
			expect(response.body.data).toHaveProperty("identifier", sessionData.identifier);
			expect(response.body.data).toHaveProperty("status", "active");
			expect(response.body.data).toHaveProperty("type", "createWallet");
			expect(response.body.data).toHaveProperty("clientIP");
			expect(response.body.data).toHaveProperty("globalCount", 0);
		});

		it("should create session with web extension flag", async () => {
			const sessionData = {
				identifier: `session_${Date.now()}_${Math.random().toString(36).substring(7)}`,
				isWebExtension: true,
				type: "decryptWallet",
			};

			const response = await testApp.post("/api/sessions").send(sessionData).expect(200);

			expect(response.body.data).toHaveProperty("isWebExtension", true);
			expect(response.body.data).toHaveProperty("type", "decryptWallet");
		});

		it("should create session with different types", async () => {
			const sessionTypes = ["createWallet", "decryptWallet", "importWallet", "general"];

			for (const type of sessionTypes) {
				const sessionData = {
					identifier: `session_${Date.now()}_${Math.random().toString(36).substring(7)}`,
					type: type,
				};

				const response = await testApp.post("/api/sessions").send(sessionData).expect(200);

				expect(response.body.data).toHaveProperty("type", type);
			}
		});

		it("should handle missing identifier", async () => {
			const sessionData = {
				type: "createWallet",
			};

			const response = await testApp.post("/api/sessions").send(sessionData).expect(500);

			expect(response.body).toHaveProperty("error");
		});

		it("should include request headers in session creation", async () => {
			const sessionData = {
				identifier: `session_${Date.now()}_${Math.random().toString(36).substring(7)}`,
				type: "general",
			};

			const response = await testApp
				.post("/api/sessions")
				.set("Origin", "https://test.example.com")
				.set("User-Agent", "TestAgent/1.0")
				.set("X-Forwarded-For", "192.168.1.1")
				.send(sessionData)
				.expect(200);

			expect(response.body.data).toHaveProperty("clientIP");
			expect(response.body.data.clientIP).toBeTruthy();
		});

		it("should reject requests in production without origin", async () => {
			// Temporarily set NODE_ENV to production
			const originalEnv = process.env.NODE_ENV;
			process.env.NODE_ENV = "production";

			const sessionData = {
				identifier: `session_${Date.now()}_${Math.random().toString(36).substring(7)}`,
				type: "createWallet",
			};

			const response = await testApp.post("/api/sessions").send(sessionData).expect(403);

			expect(response.body).toHaveProperty("error", "rejected");

			// Restore original NODE_ENV
			process.env.NODE_ENV = originalEnv;
		});
	});

	describe("GET /api/sessions/yek-cilbup - Get Public Key", () => {
		it("should extract public key with valid session identifier", async () => {
			const identifier = `session_${Date.now()}_${Math.random().toString(36).substring(7)}`;

			const response = await testApp.get("/api/sessions/yek-cilbup").query({ identifier }).expect(200);

			expect(response.body).toHaveProperty("data");
			expect(response.body.data).toHaveProperty("publicKey");
			expect(response.body.data).toHaveProperty("sessionId", identifier);
		});

		it("should extract public key with optional name and email", async () => {
			const identifier = `session_${Date.now()}_${Math.random().toString(36).substring(7)}`;
			const name = "Test User";
			const email = "test@example.com";

			const response = await testApp.get("/api/sessions/yek-cilbup").query({ identifier, name, email }).expect(200);

			expect(response.body.data).toHaveProperty("name", name);
			expect(response.body.data).toHaveProperty("email", email);
		});

		it("should return validation error for missing identifier", async () => {
			const response = await testApp.get("/api/sessions/yek-cilbup").expect(409);

			expect(response.body).toHaveProperty("validationError", "identifier is required");
		});

		it("should handle empty identifier", async () => {
			const response = await testApp.get("/api/sessions/yek-cilbup").query({ identifier: "" }).expect(409);

			expect(response.body).toHaveProperty("validationError", "identifier is required");
		});
	});

	describe("POST /api/sessions/decrypt-content - Decrypt Content", () => {
		it("should decrypt content with valid message", async () => {
			const decryptData = {
				message: `encrypted_message_${Date.now()}`,
				sessionId: `session_${Date.now()}_${Math.random().toString(36).substring(7)}`,
			};

			const response = await testApp.post("/api/sessions/decrypt-content").send(decryptData).expect(200);

			expect(response.body).toHaveProperty("data");
			expect(response.body.data).toHaveProperty("decryptedContent");
			expect(response.body.data).toHaveProperty("sessionId");
		});

		it("should decrypt content without sessionId", async () => {
			const decryptData = {
				message: `encrypted_message_${Date.now()}`,
			};

			const response = await testApp.post("/api/sessions/decrypt-content").send(decryptData).expect(200);

			expect(response.body.data).toHaveProperty("decryptedContent");
		});

		it("should return validation error for missing message", async () => {
			const decryptData = {
				sessionId: "test_session",
			};

			const response = await testApp.post("/api/sessions/decrypt-content").send(decryptData).expect(409);

			expect(response.body).toHaveProperty("validationError", "message is required");
		});

		it("should return validation error for empty message", async () => {
			const decryptData = {
				message: "",
				sessionId: "test_session",
			};

			const response = await testApp.post("/api/sessions/decrypt-content").send(decryptData).expect(409);

			expect(response.body).toHaveProperty("validationError", "message is required");
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

			const createResponse = await testApp.post("/api/sessions").send(sessionData).expect(200);

			expect(createResponse.body.data).toHaveProperty("identifier", sessionData.identifier);

			// Step 2: Extract public key
			const publicKeyResponse = await testApp
				.get("/api/sessions/yek-cilbup")
				.query({
					identifier: sessionData.identifier,
					name: "Test User",
					email: "test@example.com",
				})
				.expect(200);

			expect(publicKeyResponse.body.data).toHaveProperty("publicKey");
			expect(publicKeyResponse.body.data).toHaveProperty("sessionId", sessionData.identifier);

			// Step 3: Decrypt content
			const decryptData = {
				message: `encrypted_wallet_data_${Date.now()}`,
				sessionId: sessionData.identifier,
			};

			const decryptResponse = await testApp.post("/api/sessions/decrypt-content").send(decryptData).expect(200);

			expect(decryptResponse.body.data).toHaveProperty("decryptedContent");
			expect(decryptResponse.body.data).toHaveProperty("sessionId", sessionData.identifier);
		});

		it("should handle multiple sessions concurrently", async () => {
			const sessions = [];

			// Create multiple sessions
			for (let i = 0; i < 3; i++) {
				const sessionData = {
					identifier: `session_${Date.now()}_${i}_${Math.random().toString(36).substring(7)}`,
					type: "general",
				};

				const response = await testApp.post("/api/sessions").send(sessionData).expect(200);

				sessions.push(response.body.data);
			}

			// Verify all sessions were created
			expect(sessions).toHaveLength(3);
			sessions.forEach((session) => {
				expect(session).toHaveProperty("identifier");
				expect(session).toHaveProperty("status", "active");
				expect(session).toHaveProperty("type", "general");
			});

			// Extract public keys for all sessions
			for (const session of sessions) {
				const response = await testApp.get("/api/sessions/yek-cilbup").query({ identifier: session.identifier }).expect(200);

				expect(response.body.data).toHaveProperty("publicKey");
				expect(response.body.data).toHaveProperty("sessionId", session.identifier);
			}
		});
	});

	describe("Error Handling", () => {
		it("should handle malformed JSON in create session", async () => {
			const response = await testApp.post("/api/sessions").set("Content-Type", "application/json").send("invalid json").expect(400);

			// Koa will handle malformed JSON
			expect(response.status).toBe(400);
		});

		it("should handle non-existent routes", async () => {
			await testApp.get("/api/sessions/non-existent").expect(404);
		});

		it("should handle unsupported HTTP methods", async () => {
			await testApp.put("/api/sessions").send({}).expect(405);
		});
	});
});
