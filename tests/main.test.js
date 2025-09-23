/**
 * Main Test Suite for Zelf Online Version
 *
 * This file sets up the testing environment and provides utilities
 * for testing the Zelf API endpoints and functionality.
 */
const request = require("supertest");

// Load environment variables
require("dotenv").config();

// Import test data
const TEST_DATA = require("./test-data");

// Test configuration
const TEST_CONFIG = {
	baseUrl: process.env.TEST_BASE_URL || `http://localhost:${process.env.PORT || 3003}`,
	apiBasePath: "/api",
	testTimeout: 30000, // 30 seconds
	sessionTimeout: 300000, // 5 minutes
};

/**
 * Test utilities and helpers
 */
class TestUtils {
	constructor() {
		this.jwtToken = null;
		this.tokenExpiry = null;
		this.sessionId = null;
	}

	/**
	 * Initialize a new session and generate JWT token for API requests
	 * @returns {Promise<string>} JWT token
	 */
	async initializeSession() {
		try {
			console.log("🔄 Initializing session and JWT token...");

			// Generate unique session identifier
			this.sessionId = `test-session-${Date.now()}-${Math.random().toString(36).substring(2, 8)}`;

			// Create session first
			const sessionResponse = await request(TEST_CONFIG.baseUrl)
				.post(`${TEST_CONFIG.apiBasePath}/sessions`)
				.set("Origin", TEST_CONFIG.baseUrl)
				.set("X-Forwarded-For", "127.0.0.1")
				.send({
					identifier: this.sessionId,
					isWebExtension: false,
					type: "general",
					clientIP: "127.0.0.1",
				})
				.expect(200);

			if (sessionResponse.body && sessionResponse.body.data && sessionResponse.body.data.token) {
				console.log("✅ Session created successfully");
				console.log(`📋 Session Token: ${sessionResponse.body.data.token.substring(0, 20)}...`);

				// Use the token directly from the session response
				this.jwtToken = sessionResponse.body.data.token;
				this.tokenExpiry = Date.now() + TEST_CONFIG.sessionTimeout;
				console.log("✅ JWT token received from session");
				return this.jwtToken;
			} else {
				throw new Error("Invalid session response format");
			}
		} catch (error) {
			console.error("❌ Failed to initialize session:", error.message);
			throw error;
		}
	}

	/**
	 * Get current JWT token, initialize if needed
	 * @returns {Promise<string>} JWT token
	 */
	async getJWTToken() {
		if (!this.jwtToken || Date.now() > this.tokenExpiry) {
			return await this.initializeSession();
		}
		return this.jwtToken;
	}

	/**
	 * Make authenticated API request
	 * @param {string} method - HTTP method
	 * @param {string} endpoint - API endpoint
	 * @param {Object} data - Request data
	 * @returns {Promise} Supertest response
	 */
	async makeAuthenticatedRequest(method, endpoint, data = {}) {
		const token = await this.getJWTToken();

		let req;
		switch (method.toLowerCase()) {
			case "get":
				req = request(TEST_CONFIG.baseUrl).get(endpoint);
				break;
			case "post":
				req = request(TEST_CONFIG.baseUrl).post(endpoint);
				break;
			case "put":
				req = request(TEST_CONFIG.baseUrl).put(endpoint);
				break;
			case "delete":
				req = request(TEST_CONFIG.baseUrl).delete(endpoint);
				break;
			default:
				throw new Error(`Unsupported HTTP method: ${method}`);
		}

		req = req.set("Authorization", `Bearer ${token}`).set("Content-Type", "application/json");

		switch (method.toLowerCase()) {
			case "get":
				return req.query(data);
			case "post":
			case "put":
				return req.send(data);
			case "delete":
				return req;
			default:
				throw new Error(`Unsupported HTTP method: ${method}`);
		}
	}

	/**
	 * Get test face data (base64 encoded)
	 * @returns {string} Base64 encoded face image
	 */
	getTestFaceData() {
		return TEST_DATA.faceBase64;
	}

	/**
	 * Get test password
	 * @returns {string} Test password
	 */
	getTestPassword() {
		return TEST_DATA.password;
	}

	/**
	 * Generate a unique test tag name
	 * @param {string} domain - Domain for the tag (default: avax)
	 * @returns {string} Unique test tag name
	 */
	generateTestTagName(domain = "avax") {
		return TEST_DATA.generateTestTagName(domain);
	}

	/**
	 * Generate a unique tag name for testing
	 * @param {string} domain - Domain suffix (e.g., 'avax', 'btc')
	 * @returns {string} Unique tag name
	 */
	generateTestTagName(domain = "avax") {
		const timestamp = Date.now();
		const random = Math.random().toString(36).substring(2, 8);
		return `test-${timestamp}-${random}.${domain}`;
	}

	/**
	 * Wait for specified milliseconds
	 * @param {number} ms - Milliseconds to wait
	 * @returns {Promise} Promise that resolves after delay
	 */
	async wait(ms) {
		return new Promise((resolve) => setTimeout(resolve, ms));
	}

	/**
	 * Validate API response structure
	 * @param {Object} response - API response
	 * @param {string} expectedField - Expected field in response
	 * @returns {boolean} Whether response is valid
	 */
	validateResponse(response, expectedField = "data") {
		return response && response.body && response.body[expectedField] !== undefined;
	}

	/**
	 * Log test step
	 * @param {string} step - Step description
	 */
	logStep(step) {
		console.log(`📝 ${step}`);
	}

	/**
	 * Log test result
	 * @param {string} test - Test name
	 * @param {boolean} passed - Whether test passed
	 * @param {string} message - Additional message
	 */
	logResult(test, passed, message = "") {
		const status = passed ? "✅" : "❌";
		console.log(`${status} ${test}${message ? ` - ${message}` : ""}`);
	}
}

// Global test utilities instance
const testUtils = new TestUtils();

/**
 * Test suite setup and teardown
 */
describe("Zelf API Test Suite", () => {
	beforeAll(async () => {
		console.log("🚀 Starting Zelf API Test Suite");
		console.log(`📍 Base URL: ${TEST_CONFIG.baseUrl}`);
		console.log(`⏱️  Test Timeout: ${TEST_CONFIG.testTimeout}ms`);

		// Initialize session for all tests
		try {
			await testUtils.initializeSession();
			console.log("✅ Test suite initialized successfully");
		} catch (error) {
			console.error("❌ Failed to initialize test suite:", error.message);
			throw error;
		}
	}, TEST_CONFIG.testTimeout);

	afterAll(async () => {
		console.log("🏁 Test suite completed");
	});

	// Basic connectivity test
	describe("API Connectivity", () => {
		test("should connect to API server", async () => {
			testUtils.logStep("Testing API connectivity");

			// Test an unprotected endpoint (like swagger docs)
			const response = await request(TEST_CONFIG.baseUrl).get("/docs");

			testUtils.logResult("API Connectivity", response.status === 200 || response.status === 404);
		});

		test("should have valid JWT token", async () => {
			testUtils.logStep("Validating JWT token");

			const token = await testUtils.getJWTToken();
			const isValid = token && token.length > 0;

			testUtils.logResult("JWT Token", isValid, `Token length: ${token ? token.length : 0}`);
			expect(isValid).toBe(true);
		});
	});
});

// Export utilities for use in other test files
module.exports = {
	TestUtils,
	testUtils,
	TEST_CONFIG,
	TEST_DATA,
};
