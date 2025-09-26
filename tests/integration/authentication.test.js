// Client Authentication API Integration Tests - Testing Real Running Server
// This test works with the actual running server on port 3003
const request = require("supertest");

// Test against the actual running server
const API_BASE_URL = "http://localhost:3003";

const sampleFaceFromJSON = require("../../config/0012589021.json");

describe("Client Authentication API Integration Tests - Real Server", () => {
	let authToken;
	let createdClientId;
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

	describe("1. POST /api/clients - Create Account", () => {
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

			// Record the response for analysis
			console.log("Create Account Response:", JSON.stringify(response.body, null, 2));

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
			expect(response.body.data.zelfAccount.publicData).toHaveProperty("accountCountryCode", testCountryCode);
			expect(response.body.data.zelfAccount.publicData).toHaveProperty("accountCompany", "Test Company");
			expect(response.body.data.zelfAccount.publicData).toHaveProperty("accountType", "client_account");

			// Store the created client ID for later tests (using email as identifier)
			createdClientId = response.body.data.zelfAccount.publicData.accountEmail;
			expect(createdClientId).toBeDefined();
		});

		it("should fail to create account with missing required fields", async () => {
			const invalidData = {
				name: "Test Client",
				// Missing required fields: countryCode, phone, email, faceBase64, masterPassword
			};

			const response = await request(API_BASE_URL).post("/api/clients").set("Origin", "https://test.example.com").send(invalidData);

			console.log("Create Account Validation Error Response:", JSON.stringify(response.body, null, 2));

			expect(response.status).toBe(409);
			expect(response.body).toHaveProperty("validationError");
		});

		it("should fail to create account with invalid email format", async () => {
			const invalidData = {
				name: "Test Client",
				countryCode: testCountryCode,
				phone: testPhone,
				email: "invalid-email-format",
				language: "en",
				company: "Test Company",
				faceBase64: sampleFaceFromJSON.faceBase64,
				masterPassword: sampleFaceFromJSON.password,
			};

			const response = await request(API_BASE_URL).post("/api/clients").set("Origin", "https://test.example.com").send(invalidData);

			console.log("Create Account Invalid Email Response:", JSON.stringify(response.body, null, 2));

			expect(response.status).toBe(409);
			expect(response.body).toHaveProperty("validationError");
		});
	});

	describe("2. GET /api/clients - Verify Client (Account Available)", () => {
		it("should verify that the created client exists by email", async () => {
			const response = await request(API_BASE_URL).get("/api/clients").query({ email: testEmail });

			console.log("Verify Client (Available) Response:", JSON.stringify(response.body, null, 2));

			expect(response.status).toBe(200);
			expect(response.body).toHaveProperty("data");
			expect(response.body.data).toHaveProperty("id");
			expect(response.body.data).toHaveProperty("cid");
			expect(response.body.data).toHaveProperty("url");
			expect(response.body.data).toHaveProperty("publicData");
			expect(response.body.data.publicData).toHaveProperty("accountEmail", testEmail);
			expect(response.body.data.publicData).toHaveProperty("accountPhone", testPhone);
			expect(response.body.data.publicData).toHaveProperty("accountCompany", "Test Company");
			expect(response.body.data.publicData).toHaveProperty("accountCountryCode", testCountryCode);
			expect(response.body.data.publicData).toHaveProperty("accountType", "client_account");
		});

		it("should verify that the created client exists by phone", async () => {
			const response = await request(API_BASE_URL).get("/api/clients").query({
				countryCode: testCountryCode,
				phone: testPhone,
			});

			console.log("Verify Client (Available by Phone) Response:", JSON.stringify(response.body, null, 2));

			expect(response.status).toBe(200);
			expect(response.body).toHaveProperty("data");
			expect(response.body.data).toHaveProperty("id");
			expect(response.body.data).toHaveProperty("cid");
			expect(response.body.data).toHaveProperty("url");
			expect(response.body.data).toHaveProperty("publicData");
			expect(response.body.data.publicData).toHaveProperty("accountEmail", testEmail);
			expect(response.body.data.publicData).toHaveProperty("accountPhone", testPhone);
			expect(response.body.data.publicData).toHaveProperty("accountCompany", "Test Company");
			expect(response.body.data.publicData).toHaveProperty("accountCountryCode", testCountryCode);
			expect(response.body.data.publicData).toHaveProperty("accountType", "client_account");
		});

		it("should return client not found for non-existent email", async () => {
			const response = await request(API_BASE_URL).get("/api/clients").query({ email: "nonexistent@example.com" });

			console.log("Verify Client (Not Found) Response:", JSON.stringify(response.body, null, 2));

			expect(response.status).toBe(200);
			expect(response.body).toHaveProperty("data");
			expect(response.body.data).toBeNull();
		});

		it("should return all clients when no parameters provided", async () => {
			const response = await request(API_BASE_URL).get("/api/clients");

			console.log("Verify Client (Missing Parameters) Response:", JSON.stringify(response.body, null, 2));

			expect(response.status).toBe(200);
			expect(response.body).toHaveProperty("data");
			expect(response.body.data).toHaveProperty("data");
			expect(response.body.data).toHaveProperty("pagination");
			expect(Array.isArray(response.body.data.data)).toBe(true);
			expect(response.body.data.pagination).toHaveProperty("total");
			expect(response.body.data.pagination).toHaveProperty("page");
			expect(response.body.data.pagination).toHaveProperty("limit");
		});
	});

	// describe("3. POST /api/clients/auth - Authenticate Client", () => {
	// 	it("should authenticate client with valid credentials and get JWT", async () => {
	// 		const authData = {
	// 			email: testEmail,
	// 			faceBase64: sampleFaceFromJSON.faceBase64,
	// 			masterPassword: sampleFaceFromJSON.password,
	// 			identificationMethod: "email",
	// 		};

	// 		const response = await request(API_BASE_URL)
	// 			.post("/api/clients/auth")
	// 			.set("Origin", "https://test.example.com")
	// 			.set("x-api-key", process.env.SUPERADMIN_JWT_SECRET || "test-api-key")
	// 			.send(authData);

	// 		console.log("Authenticate Client Response:", JSON.stringify(response.body, null, 2));

	// 		expect(response.status).toBe(200);
	// 		expect(response.body).toHaveProperty("data");
	// 		expect(response.body.data).toHaveProperty("token");
	// 		expect(response.body.data).toHaveProperty("zelfProof");
	// 		expect(response.body.data).toHaveProperty("zelfAccount");

	// 		// Store the JWT token for later tests
	// 		authToken = response.body.data.token;
	// 		expect(authToken).toBeDefined();
	// 	});

	// 	it("should authenticate client with phone credentials", async () => {
	// 		const authData = {
	// 			countryCode: testCountryCode,
	// 			phone: testPhone,
	// 			faceBase64: sampleFaceFromJSON.faceBase64,
	// 			masterPassword: sampleFaceFromJSON.password,
	// 			identificationMethod: "phone",
	// 		};

	// 		const response = await request(API_BASE_URL)
	// 			.post("/api/clients/auth")
	// 			.set("Origin", "https://test.example.com")
	// 			.set("x-api-key", process.env.SUPERADMIN_JWT_SECRET || "test-api-key")
	// 			.send(authData);

	// 		console.log("Authenticate Client (Phone) Response:", JSON.stringify(response.body, null, 2));

	// 		expect(response.status).toBe(200);
	// 		expect(response.body).toHaveProperty("data");
	// 		expect(response.body.data).toHaveProperty("token");
	// 		expect(response.body.data).toHaveProperty("zelfProof");
	// 		expect(response.body.data).toHaveProperty("zelfAccount");
	// 	});

	// 	it("should fail authentication with invalid credentials", async () => {
	// 		const authData = {
	// 			email: testEmail,
	// 			faceBase64: sampleFaceFromJSON.faceBase64,
	// 			masterPassword: "wrong-password",
	// 			identificationMethod: "email",
	// 		};

	// 		const response = await request(API_BASE_URL)
	// 			.post("/api/clients/auth")
	// 			.set("Origin", "https://test.example.com")
	// 			.set("x-api-key", process.env.SUPERADMIN_JWT_SECRET || "test-api-key")
	// 			.send(authData);

	// 		console.log("Authenticate Client (Invalid Credentials) Response:", JSON.stringify(response.body, null, 2));

	// 		expect(response.status).toBe(403);
	// 		expect(response.body).toHaveProperty("validationError");
	// 	});

	// 	it("should fail authentication with missing API key", async () => {
	// 		const authData = {
	// 			email: testEmail,
	// 			faceBase64: sampleFaceFromJSON.faceBase64,
	// 			masterPassword: sampleFaceFromJSON.password,
	// 			identificationMethod: "email",
	// 		};

	// 		const response = await request(API_BASE_URL)
	// 			.post("/api/clients/auth")
	// 			.set("Origin", "https://test.example.com")
	// 			// Missing x-api-key header
	// 			.send(authData);

	// 		console.log("Authenticate Client (Missing API Key) Response:", JSON.stringify(response.body, null, 2));

	// 		expect(response.status).toBe(403);
	// 		expect(response.body).toHaveProperty("validationError", "Missing key");
	// 	});

	// 	it("should fail authentication with non-existent client", async () => {
	// 		const authData = {
	// 			email: "nonexistent@example.com",
	// 			faceBase64: sampleFaceFromJSON.faceBase64,
	// 			masterPassword: sampleFaceFromJSON.password,
	// 			identificationMethod: "email",
	// 		};

	// 		const response = await request(API_BASE_URL)
	// 			.post("/api/clients/auth")
	// 			.set("Origin", "https://test.example.com")
	// 			.set("x-api-key", process.env.SUPERADMIN_JWT_SECRET || "test-api-key")
	// 			.send(authData);

	// 		console.log("Authenticate Client (Non-existent Client) Response:", JSON.stringify(response.body, null, 2));

	// 		expect(response.status).toBe(404);
	// 		expect(response.body).toHaveProperty("validationError", "Client not found");
	// 	});

	// 	it("should fail authentication with missing required fields", async () => {
	// 		const authData = {
	// 			email: testEmail,
	// 			// Missing faceBase64, masterPassword, identificationMethod
	// 		};

	// 		const response = await request(API_BASE_URL)
	// 			.post("/api/clients/auth")
	// 			.set("Origin", "https://test.example.com")
	// 			.set("x-api-key", process.env.SUPERADMIN_JWT_SECRET || "test-api-key")
	// 			.send(authData);

	// 		console.log("Authenticate Client (Missing Fields) Response:", JSON.stringify(response.body, null, 2));

	// 		expect(response.status).toBe(409);
	// 		expect(response.body).toHaveProperty("validationError");
	// 	});
	// });

	// describe("4. PUT /api/clients/sync - Update Account", () => {
	// 	it("should update client account with valid data", async () => {
	// 		const updateData = {
	// 			name: "Updated Test Client",
	// 			email: `updated_${testEmail}`,
	// 			language: "es",
	// 			faceBase64: sampleFaceFromJSON.faceBase64,
	// 			masterPassword: sampleFaceFromJSON.password,
	// 		};

	// 		const response = await request(API_BASE_URL)
	// 			.put("/api/clients/sync")
	// 			.set("Origin", "https://test.example.com")
	// 			.set("x-api-key", process.env.SUPERADMIN_JWT_SECRET || "test-api-key")
	// 			.send(updateData);

	// 		console.log("Update Account Response:", JSON.stringify(response.body, null, 2));

	// 		expect(response.status).toBe(200);
	// 		expect(response.body).toHaveProperty("data");
	// 		expect(response.body.data).toHaveProperty("message");
	// 		expect(response.body.data).toHaveProperty("client");
	// 		expect(response.body.data.client).toHaveProperty("name", "Updated Test Client");
	// 		expect(response.body.data.client).toHaveProperty("email", `updated_${testEmail}`);
	// 		expect(response.body.data.client).toHaveProperty("language", "es");
	// 	});

	// 	it("should fail update with missing API key", async () => {
	// 		const updateData = {
	// 			name: "Updated Test Client",
	// 			faceBase64: sampleFaceFromJSON.faceBase64,
	// 			masterPassword: sampleFaceFromJSON.password,
	// 		};

	// 		const response = await request(API_BASE_URL)
	// 			.put("/api/clients/sync")
	// 			.set("Origin", "https://test.example.com")
	// 			// Missing x-api-key header
	// 			.send(updateData);

	// 		console.log("Update Account (Missing API Key) Response:", JSON.stringify(response.body, null, 2));

	// 		expect(response.status).toBe(403);
	// 		expect(response.body).toHaveProperty("validationError", "ApiKey not valid");
	// 	});

	// 	it("should fail update with missing required fields", async () => {
	// 		const updateData = {
	// 			name: "Updated Test Client",
	// 			// Missing faceBase64 and masterPassword
	// 		};

	// 		const response = await request(API_BASE_URL)
	// 			.put("/api/clients/sync")
	// 			.set("Origin", "https://test.example.com")
	// 			.set("x-api-key", process.env.SUPERADMIN_JWT_SECRET || "test-api-key")
	// 			.send(updateData);

	// 		console.log("Update Account (Missing Fields) Response:", JSON.stringify(response.body, null, 2));

	// 		expect(response.status).toBe(409);
	// 		expect(response.body).toHaveProperty("validationError");
	// 	});
	// });

	// describe("5. PUT /api/clients/sync/password - Change Password", () => {
	// 	it("should change password with valid data", async () => {
	// 		const passwordData = {
	// 			currentPassword: sampleFaceFromJSON.password,
	// 			newPassword: "NewSecurePassword123",
	// 			confirmPassword: "NewSecurePassword123",
	// 			faceBase64: sampleFaceFromJSON.faceBase64,
	// 			masterPassword: sampleFaceFromJSON.password,
	// 		};

	// 		const response = await request(API_BASE_URL)
	// 			.put("/api/clients/sync/password")
	// 			.set("Origin", "https://test.example.com")
	// 			.set("x-api-key", process.env.SUPERADMIN_JWT_SECRET || "test-api-key")
	// 			.send(passwordData);

	// 		console.log("Change Password Response:", JSON.stringify(response.body, null, 2));

	// 		expect(response.status).toBe(200);
	// 		expect(response.body).toHaveProperty("data");
	// 		expect(response.body.data).toHaveProperty("message", "Password updated successfully");
	// 	});

	// 	it("should fail password change with mismatched passwords", async () => {
	// 		const passwordData = {
	// 			currentPassword: sampleFaceFromJSON.password,
	// 			newPassword: "NewSecurePassword123",
	// 			confirmPassword: "DifferentPassword123",
	// 			faceBase64: sampleFaceFromJSON.faceBase64,
	// 			masterPassword: sampleFaceFromJSON.password,
	// 		};

	// 		const response = await request(API_BASE_URL)
	// 			.put("/api/clients/sync/password")
	// 			.set("Origin", "https://test.example.com")
	// 			.set("x-api-key", process.env.SUPERADMIN_JWT_SECRET || "test-api-key")
	// 			.send(passwordData);

	// 		console.log("Change Password (Mismatched) Response:", JSON.stringify(response.body, null, 2));

	// 		expect(response.status).toBe(400);
	// 		expect(response.body).toHaveProperty("validationError", "Passwords do not match");
	// 	});

	// 	it("should fail password change with missing API key", async () => {
	// 		const passwordData = {
	// 			currentPassword: sampleFaceFromJSON.password,
	// 			newPassword: "NewSecurePassword123",
	// 			confirmPassword: "NewSecurePassword123",
	// 			faceBase64: sampleFaceFromJSON.faceBase64,
	// 			masterPassword: sampleFaceFromJSON.password,
	// 		};

	// 		const response = await request(API_BASE_URL)
	// 			.put("/api/clients/sync/password")
	// 			.set("Origin", "https://test.example.com")
	// 			// Missing x-api-key header
	// 			.send(passwordData);

	// 		console.log("Change Password (Missing API Key) Response:", JSON.stringify(response.body, null, 2));

	// 		expect(response.status).toBe(403);
	// 		expect(response.body).toHaveProperty("validationError", "ApiKey not valid");
	// 	});
	// });

	// describe("6. DELETE /api/clients/{id} - Delete Account", () => {
	// 	it("should delete client account with valid ID", async () => {
	// 		const response = await request(API_BASE_URL)
	// 			.delete(`/api/clients/${createdClientId}`)
	// 			.set("Origin", "https://test.example.com")
	// 			.set("x-api-key", process.env.SUPERADMIN_JWT_SECRET || "test-api-key");

	// 		console.log("Delete Account Response:", JSON.stringify(response.body, null, 2));

	// 		expect(response.status).toBe(200);
	// 		expect(response.body).toHaveProperty("data");
	// 		expect(response.body.data).toHaveProperty("message", "Client deleted successfully");
	// 	});

	// 	it("should fail to delete non-existent client", async () => {
	// 		const response = await request(API_BASE_URL)
	// 			.delete("/api/clients/non-existent-id")
	// 			.set("Origin", "https://test.example.com")
	// 			.set("x-api-key", process.env.SUPERADMIN_JWT_SECRET || "test-api-key");

	// 		console.log("Delete Account (Non-existent) Response:", JSON.stringify(response.body, null, 2));

	// 		expect(response.status).toBe(404);
	// 		expect(response.body).toHaveProperty("validationError", "Client not found");
	// 	});

	// 	it("should fail to delete with missing API key", async () => {
	// 		const response = await request(API_BASE_URL).delete(`/api/clients/${createdClientId}`).set("Origin", "https://test.example.com");
	// 		// Missing x-api-key header

	// 		console.log("Delete Account (Missing API Key) Response:", JSON.stringify(response.body, null, 2));

	// 		expect(response.status).toBe(403);
	// 		expect(response.body).toHaveProperty("validationError", "ApiKey not valid");
	// 	});
	// });

	// describe("7. Verify Account After Deletion", () => {
	// 	it("should confirm client no longer exists after deletion", async () => {
	// 		const response = await request(API_BASE_URL).get("/api/clients").query({ email: testEmail });

	// 		console.log("Verify Account (After Deletion) Response:", JSON.stringify(response.body, null, 2));

	// 		expect(response.status).toBe(404);
	// 		expect(response.body).toHaveProperty("validationError", "Client not found");
	// 	});
	// });
});
