// License API Integration Tests - Testing Real Running Server
// This test works with the actual running server on port 3003
const request = require("supertest");

// Test against the actual running server
const API_BASE_URL = "http://localhost:3003";

const sampleFaceFromJSON = require("../../config/0012589021.json");

describe("License API Integration Tests - Real Server", () => {
	let authToken;
	let accountEmail;
	let testEmail;
	let testPhone;
	let testCountryCode;

	// Generate unique test data
	beforeAll(() => {
		const timestamp = Date.now();
		const randomSuffix = Math.random().toString(36).substring(7);
		testEmail = `testclient_${timestamp}_${randomSuffix}@example.com`;
		testPhone = `555${timestamp.toString().slice(-7)}`;
		testCountryCode = "+1";
	});

	describe("1. POST /api/clients - Create Account (Prerequisite)", () => {
		it("should create a new client account with valid data", async () => {
			const createData = {
				name: "Test Client",
				countryCode: testCountryCode,
				phone: testPhone,
				email: testEmail,
				language: "en",
				company: "Test Company",
				faceBase64: sampleFaceFromJSON.faceBase64,
				masterPassword: sampleFaceFromJSON.password,
			};

			const response = await request(API_BASE_URL).post("/api/clients").set("Origin", "https://test.example.com").send(createData);

			expect(response.status).toBe(200);
			expect(response.body.data).toHaveProperty("ipfsHash");
			expect(response.body.data).toHaveProperty("token");
			expect(response.body.data).toHaveProperty("zelfAccount");
			expect(response.body.data).toHaveProperty("zelfProof");

			// Check the zelfAccount structure
			expect(response.body.data.zelfAccount).toHaveProperty("publicData");
			expect(response.body.data.zelfAccount.publicData).toHaveProperty("name", "Test Client");
			expect(response.body.data.zelfAccount.publicData).toHaveProperty("accountEmail", testEmail);
			expect(response.body.data.zelfAccount.publicData).toHaveProperty("accountPhone", testPhone);
			expect(response.body.data.zelfAccount.publicData).toHaveProperty("accountCompany", "Test Company");
			expect(response.body.data.zelfAccount.publicData).toHaveProperty("accountCountryCode", testCountryCode);
			expect(response.body.data.zelfAccount.publicData).toHaveProperty("accountType", "client_account");
			expect(response.body.data.zelfAccount.publicData).toHaveProperty("accountSubscriptionId", "free");

			// Store the authentication token and account email for subsequent tests
			authToken = response.body.data.token;
			accountEmail = response.body.data.zelfAccount.publicData.accountEmail;

			console.log("Created client account:", {
				email: accountEmail,
				token: authToken ? "Present" : "Missing",
			});
		});
	});

	describe("2. GET /api/license/my-license - Get My License", () => {
		it("should get user's license information (no license exists yet)", async () => {
			const response = await request(API_BASE_URL)
				.get("/api/license/my-license")
				.set("Origin", "https://test.example.com")
				.set("Authorization", `Bearer ${authToken}`);

			console.log("Get My License Response:", { response: response.body });

			expect(response.status).toBe(200);
			expect(response.body).toHaveProperty("data");
			expect(response.body.data).toHaveProperty("myLicense");
			expect(response.body.data).toHaveProperty("zelfAccount");

			// Since no license exists yet, myLicense should be null
			expect(response.body.data.myLicense).toBeNull();

			// Check the zelfAccount structure matches the expected format
			expect(response.body.data.zelfAccount).toHaveProperty("id");
			expect(response.body.data.zelfAccount).toHaveProperty("name");
			expect(response.body.data.zelfAccount).toHaveProperty("cid");
			expect(response.body.data.zelfAccount).toHaveProperty("size");
			expect(response.body.data.zelfAccount).toHaveProperty("number_of_files");
			expect(response.body.data.zelfAccount).toHaveProperty("mime_type");
			expect(response.body.data.zelfAccount).toHaveProperty("group_id");
			expect(response.body.data.zelfAccount).toHaveProperty("created_at");
			expect(response.body.data.zelfAccount).toHaveProperty("url");
			expect(response.body.data.zelfAccount).toHaveProperty("publicData");

			// Check publicData structure
			expect(response.body.data.zelfAccount.publicData).toHaveProperty("accountCompany", "Test Company");
			expect(response.body.data.zelfAccount.publicData).toHaveProperty("accountCountryCode", testCountryCode);
			expect(response.body.data.zelfAccount.publicData).toHaveProperty("accountEmail", testEmail);
			expect(response.body.data.zelfAccount.publicData).toHaveProperty("accountPhone", testPhone);
			expect(response.body.data.zelfAccount.publicData).toHaveProperty("accountSubscriptionId", "free");
			expect(response.body.data.zelfAccount.publicData).toHaveProperty("accountType", "client_account");
		});

		it("should fail to get license without authentication", async () => {
			const response = await request(API_BASE_URL).get("/api/license/my-license").set("Origin", "https://test.example.com");

			expect(response.status).toBe(401);
			expect(response.body).toHaveProperty("error", "Protected resource, use Authorization header to get access");
		});

		it("should fail to get license with invalid token", async () => {
			const response = await request(API_BASE_URL)
				.get("/api/license/my-license")
				.set("Origin", "https://test.example.com")
				.set("Authorization", "Bearer invalid_token");

			expect(response.status).toBe(401);
			expect(response.body).toHaveProperty("error", "Protected resource, use Authorization header to get access");
		});
	});

	describe("3. POST /api/license - Create License", () => {
		it("should create a new license with valid domainConfig", async () => {
			const uniqueDomain = `testdomain${Date.now()}`;
			const domainConfig = {
				name: uniqueDomain,
				holdSuffix: ".hold",
				status: "active",
				description: "Test domain for license creation",
				limits: {
					tags: 1000,
					zelfkeys: 5000,
				},
				features: [
					{
						name: "Zelf Name System",
						code: "zns",
						description: "Encryptions, Decryptions, previews of ZelfProofs",
						enabled: true,
					},
					{
						name: "Zelf Keys",
						code: "zelfkeys",
						description: "Zelf Keys: Passwords, Notes, Credit Cards, etc.",
						enabled: true,
					},
				],
				validation: {
					minLength: 3,
					maxLength: 50,
					allowedChars: {},
					reserved: ["www", "api", "admin", "support", "help"],
					customRules: [],
				},
				storage: {
					keyPrefix: "testName",
					ipfsEnabled: true,
					arweaveEnabled: false,
					walrusEnabled: false,
				},
				tagPaymentSettings: {
					methods: ["coinbase", "crypto", "stripe"],
					currencies: ["BTC", "ETH", "SOL", "USD"],
					whitelist: {},
					pricingTable: {
						1: {
							1: 240,
							2: 432,
							3: 612,
							4: 768,
							5: 900,
							lifetime: 3600,
						},
						2: {
							1: 120,
							2: 216,
							3: 306,
							4: 384,
							5: 450,
							lifetime: 1800,
						},
					},
				},
				metadata: {
					launchDate: "2025-01-01",
					version: "1.0.0",
					documentation: "https://docs.testdomain.com",
					support: "standard",
				},
			};

			const createData = {
				domain: uniqueDomain,
				faceBase64: sampleFaceFromJSON.faceBase64,
				masterPassword: sampleFaceFromJSON.password,
				domainConfig: domainConfig,
			};

			const response = await request(API_BASE_URL)
				.post("/api/license")
				.set("Origin", "https://test.example.com")
				.set("Authorization", `Bearer ${authToken}`)
				.send(createData);

			console.log("Create License Response:", { response: response.body });

			expect(response.status).toBe(200);
			expect(response.body).toHaveProperty("data");
			expect(response.body.data).toHaveProperty("ipfs");
			expect(response.body.data).toHaveProperty("name", uniqueDomain);
			expect(response.body.data).toHaveProperty("domain", uniqueDomain);
			expect(response.body.data).toHaveProperty("owner", testEmail);
			expect(response.body.data).toHaveProperty("subscriptionId", "free");
			expect(response.body.data).toHaveProperty("expiresAt");

			// Check that the domainConfig properties are preserved
			expect(response.body.data).toHaveProperty("limits");
			expect(response.body.data.limits).toHaveProperty("tags", 1000);
			expect(response.body.data.limits).toHaveProperty("zelfkeys", 5000);

			expect(response.body.data).toHaveProperty("features");
			expect(response.body.data.features).toHaveLength(2);
			expect(response.body.data.features[0]).toHaveProperty("name", "Zelf Name System");
			expect(response.body.data.features[0]).toHaveProperty("code", "zns");
			expect(response.body.data.features[0]).toHaveProperty("enabled", true);

			expect(response.body.data).toHaveProperty("validation");
			expect(response.body.data.validation).toHaveProperty("minLength", 3);
			expect(response.body.data.validation).toHaveProperty("maxLength", 50);

			expect(response.body.data).toHaveProperty("storage");
			expect(response.body.data.storage).toHaveProperty("keyPrefix", "testName");
			expect(response.body.data.storage).toHaveProperty("ipfsEnabled", true);

			expect(response.body.data).toHaveProperty("tagPaymentSettings");
			expect(response.body.data.tagPaymentSettings).toHaveProperty("methods");
			expect(response.body.data.tagPaymentSettings.methods).toContain("coinbase");
			expect(response.body.data.tagPaymentSettings).toHaveProperty("currencies");
			expect(response.body.data.tagPaymentSettings.currencies).toContain("BTC");

			expect(response.body.data).toHaveProperty("metadata");
			expect(response.body.data.metadata).toHaveProperty("version", "1.0.0");
			expect(response.body.data.metadata).toHaveProperty("support", "standard");
		});

		it("should fail to create license without authentication", async () => {
			const domainConfig = {
				name: "testdomain",
				limits: { tags: 1000, zelfkeys: 5000 },
				features: [
					{
						name: "Zelf Name System",
						code: "zns",
						description: "Test feature",
						enabled: true,
					},
				],
				validation: { minLength: 3, maxLength: 50, allowedChars: {}, reserved: [], customRules: [] },
				storage: { keyPrefix: "testName", ipfsEnabled: true, arweaveEnabled: false, walrusEnabled: false },
				tagPaymentSettings: {
					methods: ["coinbase"],
					currencies: ["BTC"],
					whitelist: {},
					pricingTable: { 1: { 1: 240, 2: 432, 3: 612, 4: 768, 5: 900, lifetime: 3600 } },
				},
			};

			const createData = {
				domain: "testdomain",
				faceBase64: sampleFaceFromJSON.faceBase64,
				masterPassword: sampleFaceFromJSON.password,
				domainConfig: domainConfig,
			};

			const response = await request(API_BASE_URL).post("/api/license").set("Origin", "https://test.example.com").send(createData);

			expect(response.status).toBe(401);
			expect(response.body).toHaveProperty("error", "Protected resource, use Authorization header to get access");
		});

		it("should fail to create license with invalid domainConfig", async () => {
			const invalidDomainConfig = {
				name: "testdomain",
				limits: { tags: -1, zelfkeys: 5000 }, // Invalid negative tags
				features: [
					{
						name: "Zelf Name System",
						// Missing required fields: code, description, enabled
					},
				],
				validation: { minLength: 0, maxLength: 50, allowedChars: {}, reserved: [], customRules: [] }, // Invalid minLength
				storage: { keyPrefix: "testName", ipfsEnabled: true, arweaveEnabled: false, walrusEnabled: false },
				tagPaymentSettings: {
					methods: ["invalid_method"], // Invalid method
					currencies: ["BTC"],
					whitelist: {},
					pricingTable: { 1: { 1: 240, 2: 432, 3: 612, 4: 768, 5: 900, lifetime: 3600 } },
				},
			};

			const createData = {
				domain: "testdomain",
				faceBase64: sampleFaceFromJSON.faceBase64,
				masterPassword: sampleFaceFromJSON.password,
				domainConfig: invalidDomainConfig,
			};

			const response = await request(API_BASE_URL)
				.post("/api/license")
				.set("Origin", "https://test.example.com")
				.set("Authorization", `Bearer ${authToken}`)
				.send(createData);

			expect(response.status).toBe(409);
			expect(response.body).toHaveProperty("validationError");
		});

		it("should fail to create license with missing required fields", async () => {
			const createData = {
				domain: "testdomain",
				faceBase64: sampleFaceFromJSON.faceBase64,
				masterPassword: sampleFaceFromJSON.password,
				// Missing domainConfig
			};

			const response = await request(API_BASE_URL)
				.post("/api/license")
				.set("Origin", "https://test.example.com")
				.set("Authorization", `Bearer ${authToken}`)
				.send(createData);

			expect(response.status).toBe(409);
			expect(response.body).toHaveProperty("validationError");
		});
	});

	describe("4. DELETE /api/license - Delete License", () => {
		it("should fail to delete license with invalid credentials", async () => {
			const deleteData = {
				faceBase64: sampleFaceFromJSON.faceBase64,
				masterPassword: "wrong_password",
			};

			const response = await request(API_BASE_URL)
				.delete("/api/license")
				.set("Origin", "https://test.example.com")
				.set("Authorization", `Bearer ${authToken}`)
				.send(deleteData);

			expect(response.status).toBe(500);
			expect(response.body).toHaveProperty("code", "InternalServerError");
			expect(response.body).toHaveProperty("message", "THE PROVIDED PASSWORD IS INVALID.");
		});

		it("should delete the license created in test 3", async () => {
			// Delete the license that was created in the previous test
			const deleteData = {
				faceBase64: sampleFaceFromJSON.faceBase64,
				masterPassword: sampleFaceFromJSON.password,
			};

			const response = await request(API_BASE_URL)
				.delete("/api/license")
				.set("Origin", "https://test.example.com")
				.set("Authorization", `Bearer ${authToken}`)
				.send(deleteData);

			console.log("Delete License Response:", { response: response.body });

			expect(response.status).toBe(200);
			expect(response.body).toHaveProperty("data");
			expect(response.body.data).toHaveProperty("success", true);
			expect(response.body.data).toHaveProperty("message", "License deleted successfully");
			expect(response.body.data).toHaveProperty("deletedFiles");
		});

		it("should fail to delete license without authentication", async () => {
			const deleteData = {
				faceBase64: sampleFaceFromJSON.faceBase64,
				masterPassword: sampleFaceFromJSON.password,
			};

			const response = await request(API_BASE_URL).delete("/api/license").set("Origin", "https://test.example.com").send(deleteData);

			expect(response.status).toBe(401);
			expect(response.body).toHaveProperty("error", "Protected resource, use Authorization header to get access");
		});

		// it("should fail to delete license when no license exists", async () => {
		// 	// Create a new client without any license
		// 	const timestamp = Date.now();
		// 	const randomSuffix = Math.random().toString(36).substring(7);
		// 	const newTestEmail = `testclient_${timestamp}_${randomSuffix}@example.com`;
		// 	const newTestPhone = `555${timestamp.toString().slice(-7)}`;

		// 	const createData = {
		// 		name: "Test Client for No License",
		// 		countryCode: "+1",
		// 		phone: newTestPhone,
		// 		email: newTestEmail,
		// 		language: "en",
		// 		company: "Test Company",
		// 		faceBase64: sampleFaceFromJSON.faceBase64,
		// 		masterPassword: sampleFaceFromJSON.password,
		// 	};

		// 	const createResponse = await request(API_BASE_URL).post("/api/clients").set("Origin", "https://test.example.com").send(createData);

		// 	expect(createResponse.status).toBe(200);
		// 	const newAuthToken = createResponse.body.data.token;

		// 	// Try to delete license from client that has no license
		// 	const deleteData = {
		// 		faceBase64: sampleFaceFromJSON.faceBase64,
		// 		masterPassword: sampleFaceFromJSON.password,
		// 	};

		// 	const response = await request(API_BASE_URL)
		// 		.delete("/api/license")
		// 		.set("Origin", "https://test.example.com")
		// 		.set("Authorization", `Bearer ${newAuthToken}`)
		// 		.send(deleteData);

		// 	expect(response.status).toBe(404);
		// 	expect(response.body).toHaveProperty("code", "NotFound");
		// 	expect(response.body).toHaveProperty("message", "license_not_found");

		// 	// Cleanup: Delete the temporary client
		// 	try {
		// 		await request(API_BASE_URL)
		// 			.delete("/api/clients")
		// 			.set("Origin", "https://test.example.com")
		// 			.set("Authorization", `Bearer ${newAuthToken}`)
		// 			.send({
		// 				accountEmail: newTestEmail,
		// 				masterPassword: sampleFaceFromJSON.password,
		// 				faceBase64: sampleFaceFromJSON.faceBase64,
		// 			});
		// 	} catch (error) {
		// 		console.error("Cleanup failed for temporary client:", error.message);
		// 	}
		// });

		// it("should fail to delete license with missing required fields", async () => {
		// 	const deleteData = {
		// 		// Missing faceBase64 and masterPassword
		// 	};

		// 	const response = await request(API_BASE_URL)
		// 		.delete("/api/license")
		// 		.set("Origin", "https://test.example.com")
		// 		.set("Authorization", `Bearer ${authToken}`)
		// 		.send(deleteData);

		// 	expect(response.status).toBe(409);
		// 	expect(response.body).toHaveProperty("validationError");
		// });
	});

	// Cleanup: Delete the test client after all tests
	afterAll(async () => {
		if (authToken && accountEmail) {
			try {
				console.log("Cleaning up test client:", accountEmail);

				const deleteResponse = await request(API_BASE_URL)
					.delete("/api/clients")
					.set("Origin", "https://test.example.com")
					.set("Authorization", `Bearer ${authToken}`)
					.send({
						accountEmail: accountEmail,
						masterPassword: sampleFaceFromJSON.password,
						faceBase64: sampleFaceFromJSON.faceBase64,
					});

				console.log("Cleanup response:", {
					status: deleteResponse.status,
					message: deleteResponse.body.data?.message || deleteResponse.body.message,
				});
			} catch (error) {
				console.error("Cleanup failed:", error.message);
			}
		}
	});
});
