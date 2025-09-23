// Global test setup
const mongoose = require("mongoose");
const testConfig = require("./config/test.config");

// Set test environment variables from config
Object.assign(process.env, testConfig.env);

// Increase timeout for async operations
jest.setTimeout(testConfig.test.timeout);

// Global test utilities
global.testUtils = {
	// Helper to create test data
	createTestUser: () => ({
		email: "test@example.com",
		password: "testpassword123",
		username: "testuser",
	}),

	// Helper to generate random strings
	generateRandomString: (length = 10) => {
		return Math.random()
			.toString(36)
			.substring(2, length + 2);
	},

	// Helper to wait for async operations
	wait: (ms) => new Promise((resolve) => setTimeout(resolve, ms)),
};

// NO MOCKING - Tests work with real data only
// Console methods are kept for debugging purposes
global.console = {
	...console,
	// Keep console methods for debugging real data operations
};
