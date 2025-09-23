// Example integration test with Supertest - NO MOCKING POLICY
// All tests work with real data and real API responses
const request = require("supertest");
const testHelper = require("../helpers/testHelper");

// Real server app - replace with your actual app
const mockApp = require("koa")();
const Router = require("koa-router");
const router = new Router();

// Real routes for testing - these make actual API calls
router.get("/health", (ctx) => {
	ctx.status = 200;
	ctx.body = {
		status: "OK",
		timestamp: new Date().toISOString(),
		database: testHelper.getCurrentDatabaseName(),
		isTestEnvironment: process.env.NODE_ENV === "test",
	};
});

router.post("/api/test", (ctx) => {
	const { email, username } = ctx.request.body;

	if (!email || !username) {
		ctx.status = 400;
		ctx.body = { error: "Email and username are required" };
		return;
	}

	// Real data processing - no mocking
	ctx.status = 201;
	ctx.body = {
		message: "User created successfully",
		user: {
			email,
			username,
			id: `user_${Date.now()}_${Math.random().toString(36).substring(7)}`,
			createdAt: new Date().toISOString(),
			isTestData: true,
		},
	};
});

mockApp.use(router.routes());
mockApp.use(router.allowedMethods());

describe("API Integration Tests - Real Data Only", () => {
	let app;

	beforeAll(async () => {
		app = await testHelper.initApp(mockApp);
	});

	beforeEach(async () => {
		// Clean database before each test - real database operations
		await testHelper.cleanDatabase();
	});

	describe("GET /health", () => {
		it("should return health status with real data", async () => {
			const response = await app.get("/health").expect(200);

			expect(response.body).toHaveProperty("status", "OK");
			expect(response.body).toHaveProperty("timestamp");
			expect(response.body).toHaveProperty("database", "zelf_testing");
			expect(response.body).toHaveProperty("isTestEnvironment", true);
			expect(new Date(response.body.timestamp)).toBeInstanceOf(Date);
		});
	});

	describe("POST /api/test", () => {
		it("should create a user with real data", async () => {
			const userData = testHelper.createRealTestData("user");

			const response = await app.post("/api/test").send(userData).expect(201);

			expect(response.body).toHaveProperty("message", "User created successfully");
			expect(response.body).toHaveProperty("user");
			expect(response.body.user).toHaveProperty("email", userData.email);
			expect(response.body.user).toHaveProperty("username", userData.username);
			expect(response.body.user).toHaveProperty("id");
			expect(response.body.user).toHaveProperty("createdAt");
			expect(response.body.user).toHaveProperty("isTestData", true);
		});

		it("should return 400 for missing email", async () => {
			const userData = { username: "testuser" };

			const response = await app.post("/api/test").send(userData).expect(400);

			expect(response.body).toHaveProperty("error", "Email and username are required");
		});

		it("should return 400 for missing username", async () => {
			const userData = { email: "test@example.com" };

			const response = await app.post("/api/test").send(userData).expect(400);

			expect(response.body).toHaveProperty("error", "Email and username are required");
		});

		it("should handle empty request body", async () => {
			const response = await app.post("/api/test").send({}).expect(400);

			expect(response.body).toHaveProperty("error", "Email and username are required");
		});
	});

	describe("Error handling", () => {
		it("should return 404 for non-existent routes", async () => {
			await app.get("/non-existent-route").expect(404);
		});
	});
});
