// Example unit test
const testHelper = require("../helpers/testHelper");

describe("Test Helper Unit Tests", () => {
	beforeEach(() => {
		// Clean up before each test
		jest.clearAllMocks();
	});

	describe("createTestUser", () => {
		it("should create a test user with default values", () => {
			const user = testHelper.createTestUser();

			expect(user).toHaveProperty("email", "test@example.com");
			expect(user).toHaveProperty("password", "testpassword123");
			expect(user).toHaveProperty("username", "testuser");
		});

		it("should create a test user with custom overrides", () => {
			const customUser = testHelper.createTestUser({
				email: "custom@example.com",
				username: "customuser",
			});

			expect(customUser.email).toBe("custom@example.com");
			expect(customUser.username).toBe("customuser");
			expect(customUser.password).toBe("testpassword123"); // Should keep default
		});
	});

	describe("generateRandomEmail", () => {
		it("should generate a valid email format", () => {
			const email = testHelper.generateRandomEmail();

			expect(email).toMatch(/^test[a-z0-9]+@example\.com$/);
		});

		it("should generate different emails on multiple calls", () => {
			const email1 = testHelper.generateRandomEmail();
			const email2 = testHelper.generateRandomEmail();

			expect(email1).not.toBe(email2);
		});
	});

	describe("generateRandomUsername", () => {
		it("should generate a valid username format", () => {
			const username = testHelper.generateRandomUsername();

			expect(username).toMatch(/^testuser[a-z0-9]+$/);
		});

		it("should generate different usernames on multiple calls", () => {
			const username1 = testHelper.generateRandomUsername();
			const username2 = testHelper.generateRandomUsername();

			expect(username1).not.toBe(username2);
		});
	});

	describe("wait", () => {
		it("should wait for specified time", async () => {
			const start = Date.now();
			await testHelper.wait(100);
			const end = Date.now();

			expect(end - start).toBeGreaterThanOrEqual(90); // Allow some tolerance
		});
	});
});
