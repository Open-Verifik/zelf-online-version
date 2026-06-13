/**
 * Jest config for HTTP-only integration tests (supertest against a running API).
 * Same as jest.integration.config.js but without MongoDB globalSetup/globalTeardown.
 */
const testConfig = require("./tests/config/test.config");

module.exports = {
	testEnvironment: "node",
	testMatch: ["**/__tests__/**/*.js", "**/?(*.)+(spec|test).js"],
	collectCoverage: false,
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
	setupFilesAfterEnv: ["<rootDir>/tests/setup.js"],
	testTimeout: testConfig.test.timeout,
	moduleDirectories: ["node_modules", "<rootDir>"],
	transform: {},
	verbose: true,
	clearMocks: false,
	restoreMocks: false,
};
