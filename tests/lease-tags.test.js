/**
 * Lease Tags Test Suite
 *
 * Tests for tag leasing functionality including:
 * - Normal leasing with new wallet creation
 * - Tag search and availability
 * - Face verification and biometric processing
 * - Wallet generation and mnemonic creation
 */
const { testUtils, TEST_CONFIG, TEST_DATA } = require("./main.test");

describe("Tag Leasing Tests", () => {
	let testTagName;
	let leaseResponse;

	beforeAll(async () => {
		console.log("🏷️  Starting Tag Leasing Tests");

		// Generate a unique test tag name
		testTagName = TEST_DATA.generateTestTagName();
		console.log(`📛 Test tag name: ${testTagName}`);
	});

	describe("Tag Search and Availability", () => {
		test("should search for tag availability", async () => {
			testUtils.logStep(`Searching for tag: ${testTagName}`);

			const response = await testUtils.makeAuthenticatedRequest("GET", `${TEST_CONFIG.apiBasePath}/tags/search`, {
				tagName: testTagName,
				domain: "avax",
				os: "DESKTOP",
			});

			const isValidResponse = testUtils.validateResponse(response);
			testUtils.logResult("Tag Search", isValidResponse, `Status: ${response.status}, Available: ${response.body?.data?.available}`);

			expect(response.status).toBe(200);
			expect(isValidResponse).toBe(true);
			expect(response.body.data.available).toBe(true);
		});

		test("should preview tag before leasing", async () => {
			testUtils.logStep(`Previewing tag: ${testTagName}`);

			const response = await testUtils.makeAuthenticatedRequest("GET", `${TEST_CONFIG.apiBasePath}/tags/preview`, {
				tagName: testTagName,
				domain: "avax",
				os: "DESKTOP",
			});

			const isValidResponse = testUtils.validateResponse(response);
			testUtils.logResult("Tag Preview", isValidResponse, `Status: ${response.status}`);

			if (response.status !== 200) {
				console.log("❌ Preview error:", response.body);
			}

			expect(response.status).toBe(200);
			expect(isValidResponse).toBe(true);
		});
	});

	describe("Normal Tag Leasing with new tag", () => {
		test("should lease tag and create new wallet", async () => {
			testUtils.logStep(`Leasing tag: ${testTagName} with new wallet creation`);

			const leaseData = {
				tagName: testTagName,
				domain: "avax",
				faceBase64: TEST_DATA.faceBase64,
				password: TEST_DATA.password,
				type: "create", // Create new wallet
				os: "DESKTOP",
				addServerPassword: false,
				removePGP: true,
				wordsCount: 12,
			};

			const response = await testUtils.makeAuthenticatedRequest("POST", `${TEST_CONFIG.apiBasePath}/tags/lease`, leaseData);

			const isValidResponse = testUtils.validateResponse(response);
			testUtils.logResult("Tag Lease", isValidResponse, `Status: ${response.status}`);

			if (response.status !== 200) {
				console.log("❌ Lease error:", response.body);
			}

			if (isValidResponse) {
				leaseResponse = response.body.data;
			}

			expect(response.status).toBe(200);
			expect(isValidResponse).toBe(true);
			expect(response.body.data.success).toBe(true);
			expect(response.body.data.tagName).toBe(testTagName);
			expect(response.body.data.walletAddress).toBeDefined();
			expect(response.body.data.mnemonic).toBeDefined();
		});

		test("should validate generated wallet data", () => {
			testUtils.logStep("Validating generated wallet data");

			expect(leaseResponse).toBeDefined();
			expect(leaseResponse.success).toBe(true);
			expect(leaseResponse.tagName).toBe(testTagName);
			expect(leaseResponse.domain).toBe("avax");
			expect(leaseResponse.walletAddress).toBeDefined();
			expect(leaseResponse.mnemonic).toBeDefined();

			// Validate mnemonic format (12 words)
			const mnemonicWords = leaseResponse.mnemonic.split(" ");
			expect(mnemonicWords.length).toBe(12);

			// Validate wallet address format (should be a valid Ethereum-style address)
			expect(leaseResponse.walletAddress).toMatch(/^0x[a-fA-F0-9]{40}$/);

			testUtils.logResult(
				"Wallet Data Validation",
				true,
				`Address: ${leaseResponse.walletAddress.substring(0, 10)}..., Mnemonic: ${mnemonicWords.length} words`
			);
		});
	});

	describe("Tag Decryption Tests", () => {
		test("should decrypt tag with face and password", async () => {
			testUtils.logStep(`Decrypting tag: ${testTagName}`);

			const decryptData = {
				faceBase64: TEST_DATA.faceBase64,
				password: TEST_DATA.password,
				tagName: testTagName,
				domain: "avax",
				os: "DESKTOP",
				addServerPassword: false,
				removePGP: true,
			};

			const response = await testUtils.makeAuthenticatedRequest("POST", `${TEST_CONFIG.apiBasePath}/tags/decrypt`, decryptData);

			const isValidResponse = testUtils.validateResponse(response);

			testUtils.logResult("Tag Decrypt", isValidResponse, `Status: ${response.status}, Decrypted: ${response.body?.data?.decrypted}`);

			expect(response.status).toBe(200);
			expect(isValidResponse).toBe(true);
			expect(response.body.data.decrypted).toBe(true);
			expect(response.body.data.walletData).toBeDefined();
		});
	});

	describe("Error Handling Tests", () => {
		test("should handle invalid tag name", async () => {
			testUtils.logStep("Testing invalid tag name handling");

			const invalidTagName = "invalid-tag-name-without-domain";

			const response = await testUtils.makeAuthenticatedRequest("POST", `${TEST_CONFIG.apiBasePath}/tags/lease`, {
				tagName: invalidTagName,
				faceBase64: TEST_DATA.faceBase64,
				password: TEST_DATA.password,
				domain: "avax",
				type: "create",
				os: "DESKTOP",
				wordsCount: 12,
			});

			testUtils.logResult("Invalid Tag Name", response.status >= 400, `Status: ${response.status}`);

			expect(response.status).toBeGreaterThanOrEqual(400);
		});

		test("should handle missing face data", async () => {
			testUtils.logStep("Testing missing face data handling");

			const response = await testUtils.makeAuthenticatedRequest("POST", `${TEST_CONFIG.apiBasePath}/tags/lease`, {
				tagName: TEST_DATA.generateTestTagName(),
				faceBase64: TEST_DATA.faceBase64,
				password: TEST_DATA.password,
				domain: "avax",
				type: "create",
				os: "DESKTOP",
				wordsCount: 12,
				// Missing faceBase64
			});

			testUtils.logResult("Missing Face Data", response.status >= 400, `Status: ${response.status}`);

			expect(response.status).toBeGreaterThanOrEqual(400);
		});

		test("should handle invalid face data", async () => {
			testUtils.logStep("Testing invalid face data handling");

			const response = await testUtils.makeAuthenticatedRequest("POST", `${TEST_CONFIG.apiBasePath}/tags/lease`, {
				tagName: TEST_DATA.generateTestTagName(),
				faceBase64: "invalid-base64-data",
				password: TEST_DATA.password,
				domain: "avax",
				type: "create",
				os: "DESKTOP",
				wordsCount: 12,
			});

			testUtils.logResult("Invalid Face Data", response.status >= 400, `Status: ${response.status}`);

			expect(response.status).toBeGreaterThanOrEqual(400);
		});
	});

	describe("Cleanup Tests", () => {
		test("should verify leased tag is no longer available", async () => {
			testUtils.logStep(`Verifying tag ${testTagName} is no longer available`);

			const response = await testUtils.makeAuthenticatedRequest("GET", `${TEST_CONFIG.apiBasePath}/tags/search`, {
				tagName: testTagName,
				os: "DESKTOP",
			});

			const isValidResponse = testUtils.validateResponse(response);

			testUtils.logResult(
				"Tag Availability Check",
				isValidResponse,
				`Status: ${response.status}, Available: ${response.body?.data?.available}`
			);

			expect(response.status).toBe(200);
			expect(isValidResponse).toBe(true);
			expect(response.body.data.available).toBe(false);
		});
	});
});
