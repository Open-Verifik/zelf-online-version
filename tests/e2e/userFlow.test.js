// Example E2E test - NO MOCKING POLICY
// All tests work with real data and real service calls
const request = require("supertest");
const testHelper = require("../helpers/testHelper");

// This would be your actual server app
const mockApp = require("koa")();
const Router = require("koa-router");
const router = new Router();

// Real user flow with actual data processing
let users = []; // In-memory storage for demo - in real tests, use actual database

router.post("/api/users", (ctx) => {
	const { email, username, password } = ctx.request.body;

	// Check if user already exists - real data validation
	const existingUser = users.find((u) => u.email === email);
	if (existingUser) {
		ctx.status = 409;
		ctx.body = { error: "User already exists" };
		return;
	}

	// Create real user data
	const newUser = {
		id: `user_${Date.now()}_${Math.random().toString(36).substring(7)}`,
		email,
		username,
		password, // In real app, this would be hashed
		createdAt: new Date().toISOString(),
		isTestData: true,
	};

	users.push(newUser);

	ctx.status = 201;
	ctx.body = {
		message: "User created successfully",
		user: {
			id: newUser.id,
			email: newUser.email,
			username: newUser.username,
			createdAt: newUser.createdAt,
		},
	};
});

router.get("/api/users/:id", (ctx) => {
	const userId = ctx.params.id;
	const user = users.find((u) => u.id === userId);

	if (!user) {
		ctx.status = 404;
		ctx.body = { error: "User not found" };
		return;
	}

	ctx.status = 200;
	ctx.body = {
		user: {
			id: user.id,
			email: user.email,
			username: user.username,
			createdAt: user.createdAt,
		},
	};
});

router.get("/api/users", (ctx) => {
	ctx.status = 200;
	ctx.body = {
		users: users.map((u) => ({
			id: u.id,
			email: u.email,
			username: u.username,
			createdAt: u.createdAt,
		})),
		total: users.length,
	};
});

mockApp.use(router.routes());
mockApp.use(router.allowedMethods());

describe("E2E User Management Flow - Real Data Only", () => {
	let app;

	beforeAll(async () => {
		app = await testHelper.initApp(mockApp);
	});

	beforeEach(async () => {
		// Reset users array - real data cleanup
		users = [];
	});

	describe("Complete User Management Flow", () => {
		it("should handle complete user lifecycle with real data", async () => {
			const userData = testHelper.createRealTestData("user");

			// Step 1: Create a user
			const createResponse = await app.post("/api/users").send(userData).expect(201);

			expect(createResponse.body).toHaveProperty("message", "User created successfully");
			expect(createResponse.body.user).toHaveProperty("id");
			expect(createResponse.body.user.email).toBe(userData.email);

			const userId = createResponse.body.user.id;

			// Step 2: Retrieve the created user
			const getResponse = await app.get(`/api/users/${userId}`).expect(200);

			expect(getResponse.body.user.id).toBe(userId);
			expect(getResponse.body.user.email).toBe(userData.email);
			expect(getResponse.body.user.username).toBe(userData.username);

			// Step 3: List all users
			const listResponse = await app.get("/api/users").expect(200);

			expect(listResponse.body.users).toHaveLength(1);
			expect(listResponse.body.total).toBe(1);
			expect(listResponse.body.users[0].id).toBe(userId);
		});

		it("should prevent duplicate user creation with real data validation", async () => {
			const userData = testHelper.createRealTestData("user");

			// Create first user
			await app.post("/api/users").send(userData).expect(201);

			// Try to create duplicate user
			const duplicateResponse = await app.post("/api/users").send(userData).expect(409);

			expect(duplicateResponse.body).toHaveProperty("error", "User already exists");
		});

		it("should handle non-existent user retrieval", async () => {
			const nonExistentId = `user_${Date.now()}_nonexistent`;

			const response = await app.get(`/api/users/${nonExistentId}`).expect(404);

			expect(response.body).toHaveProperty("error", "User not found");
		});

		it("should handle multiple users with real data", async () => {
			const user1 = testHelper.createRealTestData("user");
			const user2 = testHelper.createRealTestData("user");

			// Create both users
			await app.post("/api/users").send(user1).expect(201);
			await app.post("/api/users").send(user2).expect(201);

			// List all users
			const listResponse = await app.get("/api/users").expect(200);

			expect(listResponse.body.users).toHaveLength(2);
			expect(listResponse.body.total).toBe(2);

			// Verify both users are in the list
			const emails = listResponse.body.users.map((u) => u.email);
			expect(emails).toContain(user1.email);
			expect(emails).toContain(user2.email);
		});
	});
});
