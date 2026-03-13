// Test helpers and utilities
const request = require("supertest");
const mongoose = require("mongoose");
const testConfig = require("../config/test.config");

class TestHelper {
	constructor() {
		this.app = null;
		this.server = null;
	}

	// Initialize the app for testing
	async initApp(app) {
		this.app = app;
		return request(app);
	}

	// Clean database collections (with safety checks)
	async cleanDatabase() {
		// Safety check: only clean test database
		if (mongoose.connection.name !== "zelf_testing") {
			throw new Error(`SAFETY ERROR: Attempted to clean non-test database: ${mongoose.connection.name}`);
		}

		const collections = mongoose.connection.collections;
		for (const key in collections) {
			const collection = collections[key];
			await collection.deleteMany({});
		}
		console.log(`Cleaned ${Object.keys(collections).length} collections from test database`);
	}

	// Create test user
	createTestUser(overrides = {}) {
		return {
			email: "test@example.com",
			password: "testpassword123",
			username: "testuser",
			...overrides,
		};
	}

	// Generate random test data
	generateRandomEmail() {
		return `test${Math.random().toString(36).substring(7)}@example.com`;
	}

	generateRandomUsername() {
		return `testuser${Math.random().toString(36).substring(7)}`;
	}

	// Wait for async operations
	async wait(ms = 100) {
		return new Promise((resolve) => setTimeout(resolve, ms));
	}

	// NO MOCKING POLICY - Tests work with real data only
	// External services are called with real data
	// No mocking of APIs, databases, or external services
	// All tests must work with actual data and real service responses

	// Database safety check
	isTestDatabase() {
		return mongoose.connection.name === "zelf_testing";
	}

	// Get current database name
	getCurrentDatabaseName() {
		return mongoose.connection.name;
	}

	// Helper to create real test data (not mocked)
	createRealTestData(type = "user") {
		const timestamp = Date.now();
		const randomSuffix = Math.random().toString(36).substring(7);

		switch (type) {
			case "user":
				return {
					email: `testuser_${timestamp}_${randomSuffix}@example.com`,
					password: "testpassword123",
					username: `testuser_${timestamp}_${randomSuffix}`,
					createdAt: new Date(),
					isTestData: true,
				};
			case "wallet":
				return {
					address: `0x${randomSuffix}${timestamp}`,
					balance: "0",
					currency: "ETH",
					createdAt: new Date(),
					isTestData: true,
				};
			case "transaction":
				return {
					hash: `0x${randomSuffix}${timestamp}`,
					from: `0x${randomSuffix}${timestamp}`,
					to: `0x${randomSuffix}${timestamp + 1}`,
					value: "1000000000000000000",
					createdAt: new Date(),
					isTestData: true,
				};
			default:
				return {
					id: `${type}_${timestamp}_${randomSuffix}`,
					createdAt: new Date(),
					isTestData: true,
				};
		}
	}
}

module.exports = new TestHelper();
