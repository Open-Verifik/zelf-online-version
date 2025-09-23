const testConfig = require("./tests/config/test.config");

module.exports = {
	// Test environment
	testEnvironment: "node",

	// Test file patterns
	testMatch: ["**/__tests__/**/*.js", "**/?(*.)+(spec|test).js"],

	// Coverage configuration
	collectCoverage: true,
	coverageDirectory: "coverage",
	coverageReporters: ["text", "lcov", "html"],
	collectCoverageFrom: [
		"Repositories/**/*.js",
		"Routes/**/*.js",
		"Core/**/*.js",
		"Utilities/**/*.js",
		"server.js",
		"socket-io-server.js",
		"!**/node_modules/**",
		"!**/coverage/**",
		"!**/tests/**",
	],

	// Setup files
	setupFilesAfterEnv: ["<rootDir>/tests/setup.js"],

	// Test timeout (in milliseconds) - from test config
	testTimeout: testConfig.test.timeout,

	// Module paths
	moduleDirectories: ["node_modules", "<rootDir>"],

	// Transform configuration
	transform: {},

	// Verbose output
	verbose: true,

	// Clear mocks between tests - DISABLED (no mocking policy)
	clearMocks: false,

	// Restore mocks between tests - DISABLED (no mocking policy)
	restoreMocks: false,

	// Global setup and teardown for integration tests
	globalSetup: "<rootDir>/tests/globalSetup.js",
	globalTeardown: "<rootDir>/tests/globalTeardown.js",
};
