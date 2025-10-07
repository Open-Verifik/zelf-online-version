// Decrypt Tag API Integration Tests - Testing Real Running Server
// This test works with the actual running server
// Tests the complete flow: Session -> Lease -> Decrypt -> Delete
const request = require("supertest");
require("dotenv").config();

// Test against the actual running server
const API_BASE_URL = `http://localhost:${process.env.PORT || 3000}`;

const sampleFaceFromJSON = require("../../config/0012589021.json");

describe("Decrypt Tag API Integration Tests - Complete Flow", () => {
	let authToken;
	let leasedTagData;
	let sampleTagName;
	let sampleDomain = "zelf";

	// Create a session and get JWT token before running tests
	beforeAll(async () => {
		const sessionData = {
			identifier: `decrypt_test_session_${Math.floor(Math.random() * 100000)
				.toString()
				.padStart(5, "0")}_${Math.random().toString(36).substring(7)}`,
			type: "createWallet",
			isWebExtension: false,
		};

		const sessionResponse = await request(API_BASE_URL)
			.post("/api/sessions")
			.set("Origin", "https://test.example.com")
			.send(sessionData)
			.expect(200);

		authToken = sessionResponse.body.data.token;
		expect(authToken).toBeDefined();
	});

	describe("Complete Decryption Flow", () => {
		it("should complete the full flow: Session -> Lease -> Decrypt -> Delete", async () => {
			// Step 1: Lease a tag
			sampleTagName = `decrypttest${Math.floor(Math.random() * 100000)
				.toString()
				.padStart(5, "0")}`;

			const leaseData = {
				tagName: sampleTagName,
				domain: sampleDomain,
				faceBase64: sampleFaceFromJSON.faceBase64,
				password: "testpassword123",
				type: "create",
				os: "DESKTOP",
				removePGP: true,
			};

			const leaseResponse = await request(API_BASE_URL)
				.post("/api/tags/lease")
				.set("Origin", "https://test.example.com")
				.set("Authorization", `Bearer ${authToken}`)
				.send(leaseData)
				.expect(200);

			// Store the leased tag data for decryption
			leasedTagData = leaseResponse.body.data;

			// Verify lease response structure
			expect(leasedTagData).toHaveProperty("zelfProof");
			expect(leasedTagData).toHaveProperty("zelfProofQRCode");
			expect(leasedTagData).toHaveProperty("zelfName", `${sampleTagName}.${sampleDomain}`);
			expect(leasedTagData).toHaveProperty("domain", sampleDomain);
			expect(leasedTagData).toHaveProperty("hasPassword");
			expect(leasedTagData).toHaveProperty("ethAddress");
			expect(leasedTagData).toHaveProperty("btcAddress");
			expect(leasedTagData).toHaveProperty("solanaAddress");
			expect(leasedTagData).toHaveProperty("suiAddress");

			console.log(`✅ Step 1: Successfully leased tag ${sampleTagName}.${sampleDomain}`);

			// delay 3 seconds to make sure the tag is indexed
			await new Promise((resolve) => setTimeout(resolve, 3000));

			// Step 2: Decrypt the tag
			const decryptData = {
				tagName: sampleTagName,
				domain: sampleDomain,
				faceBase64: sampleFaceFromJSON.faceBase64,
				os: "DESKTOP",
				password: "testpassword123", // Using the same password from offline test
				removePGP: true,
			};

			const decryptResponse = await request(API_BASE_URL)
				.post("/api/tags/decrypt")
				.set("Origin", "https://test.example.com")
				.set("Authorization", `Bearer ${authToken}`)
				.send(decryptData);

			// Verify decrypt response structure
			expect(decryptResponse.body).toHaveProperty("data");
			expect(decryptResponse.body.data).toHaveProperty("id");
			expect(decryptResponse.body.data).toHaveProperty("url");
			expect(decryptResponse.body.data).toHaveProperty("ipfsHash");
			expect(decryptResponse.body.data).toHaveProperty("cid");
			expect(decryptResponse.body.data).toHaveProperty("size");
			expect(decryptResponse.body.data).toHaveProperty("date_pinned");
			expect(decryptResponse.body.data).toHaveProperty("publicData");
			expect(decryptResponse.body.data).toHaveProperty("zelfProofQRCode");
			expect(decryptResponse.body.data).toHaveProperty("zelfProof");
			expect(decryptResponse.body.data).toHaveProperty("domain");
			expect(decryptResponse.body.data).toHaveProperty("metadata");

			// Verify publicData structure
			const publicData = decryptResponse.body.data.publicData;
			expect(publicData).toHaveProperty("btcAddress");
			expect(publicData).toHaveProperty("domain");
			expect(publicData).toHaveProperty("ethAddress");
			expect(publicData).toHaveProperty("solanaAddress");
			expect(publicData).toHaveProperty("suiAddress");
			expect(publicData).toHaveProperty("zelfName");
			expect(publicData).toHaveProperty("hasPassword");
			expect(publicData).toHaveProperty("type");
			expect(publicData).toHaveProperty("origin");
			expect(publicData).toHaveProperty("registeredAt");
			expect(publicData).toHaveProperty("expiresAt");

			// Verify wallet addresses match the leased data
			expect(publicData).toHaveProperty("ethAddress", leasedTagData.ethAddress);
			expect(publicData).toHaveProperty("btcAddress", leasedTagData.btcAddress);
			expect(publicData).toHaveProperty("solanaAddress", leasedTagData.solanaAddress);
			expect(publicData).toHaveProperty("suiAddress", leasedTagData.suiAddress);

			// Verify decrypted metadata structure
			const metadata = decryptResponse.body.data.metadata;
			expect(metadata).toHaveProperty("mnemonic");

			console.log(`✅ Step 2: Successfully decrypted tag ${sampleTagName}.${sampleDomain}`);

			// Step 3: Delete the tag
			const deleteResponse = await request(API_BASE_URL)
				.delete("/api/tags/delete")
				.set("Origin", "https://test.example.com")
				.set("Authorization", `Bearer ${authToken}`)
				.send({
					tagName: sampleTagName,
					domain: sampleDomain,
					faceBase64: sampleFaceFromJSON.faceBase64,
					password: "testpassword123",
				})
				.expect(200);

			// Verify delete response structure
			expect(deleteResponse.body).toHaveProperty("data");
			expect(deleteResponse.body.data).toHaveProperty("tagObject");
			expect(deleteResponse.body.data.tagObject).toHaveProperty("id");
			expect(deleteResponse.body.data.tagObject).toHaveProperty("url");
			expect(deleteResponse.body.data.tagObject).toHaveProperty("ipfsHash");

			console.log(`✅ Step 3: Successfully deleted tag ${sampleTagName}.${sampleDomain}`);
			console.log(`🎉 Complete flow test passed!`);
		});

		it("should handle decryption with invalid password", async () => {
			// Lease another tag for this test
			const testTagName = `testinvalidpass${Math.floor(Math.random() * 100000)
				.toString()
				.padStart(5, "0")}`;

			const leaseData = {
				tagName: testTagName,
				domain: sampleDomain,
				faceBase64: sampleFaceFromJSON.faceBase64,
				password: "testpassword123",
				type: "create",
				os: "DESKTOP",
				removePGP: true,
			};

			const leaseResponse = await request(API_BASE_URL)
				.post("/api/tags/lease")
				.set("Origin", "https://test.example.com")
				.set("Authorization", `Bearer ${authToken}`)
				.send(leaseData)
				.expect(200);

			// Try to decrypt with wrong password
			const decryptData = {
				tagName: testTagName,
				domain: sampleDomain,
				faceBase64: sampleFaceFromJSON.faceBase64,
				os: "DESKTOP",
				password: "wrongpassword",
				removePGP: true,
			};

			const decryptResponse = await request(API_BASE_URL)
				.post("/api/tags/decrypt")
				.set("Origin", "https://test.example.com")
				.set("Authorization", `Bearer ${authToken}`)
				.send(decryptData);

			// Should return error for verification failure (wrong password)
			expect([409, 500]).toContain(decryptResponse.status);
			expect(decryptResponse.body).toHaveProperty("message");
			expect(decryptResponse.body).toHaveProperty("code");

			console.log(`✅ Invalid password test passed for tag ${testTagName}.${sampleDomain}`);

			// Clean up: delete the test tag
			const deleteResponse = await request(API_BASE_URL)
				.delete("/api/tags/delete")
				.set("Origin", "https://test.example.com")
				.set("Authorization", `Bearer ${authToken}`)
				.send({
					tagName: testTagName,
					domain: sampleDomain,
					faceBase64: sampleFaceFromJSON.faceBase64, // Use correct face for cleanup
					password: "testpassword123",
					removePGP: true,
				});

			expect(deleteResponse.status).toBe(200);
			expect(deleteResponse.body).toHaveProperty("data");
			expect(deleteResponse.body.data).toHaveProperty("deletedFiles");
			expect(deleteResponse.body.data).toHaveProperty("tagObject");
		});

		it("should handle decryption with invalid face", async () => {
			// Lease another tag for this test
			const testTagName = `testinvalidface${Math.floor(Math.random() * 100000)
				.toString()
				.padStart(5, "0")}`;

			const leaseData = {
				tagName: testTagName,
				domain: sampleDomain,
				faceBase64: sampleFaceFromJSON.faceBase64,
				password: "testpassword123",
				type: "create",
				os: "DESKTOP",
				removePGP: true,
			};

			const leaseResponse = await request(API_BASE_URL)
				.post("/api/tags/lease")
				.set("Origin", "https://test.example.com")
				.set("Authorization", `Bearer ${authToken}`)
				.send(leaseData)
				.expect(200);

			// Try to decrypt with wrong face
			const decryptData = {
				tagName: testTagName,
				domain: sampleDomain,
				faceBase64: "invalid_face_data",
				os: "DESKTOP",
				password: "testpassword123",
				removePGP: true,
			};

			const decryptResponse = await request(API_BASE_URL)
				.post("/api/tags/decrypt")
				.set("Origin", "https://test.example.com")
				.set("Authorization", `Bearer ${authToken}`)
				.send(decryptData);

			// Should return error for invalid image (invalid base64)
			expect([400, 500]).toContain(decryptResponse.status);
			expect(decryptResponse.body).toHaveProperty("message");
			expect(decryptResponse.body).toHaveProperty("code");

			console.log(`✅ Invalid face test passed for tag ${testTagName}.${sampleDomain}`);

			// Clean up: delete the test tag
			const deleteResponse = await request(API_BASE_URL)
				.delete("/api/tags/delete")
				.set("Origin", "https://test.example.com")
				.set("Authorization", `Bearer ${authToken}`)
				.send({
					tagName: testTagName,
					domain: sampleDomain,
					faceBase64: sampleFaceFromJSON.faceBase64, // Use correct face for cleanup
					password: "testpassword123",
				});

			expect(deleteResponse.status).toBe(200);
			expect(deleteResponse.body).toHaveProperty("data");
			expect(deleteResponse.body.data).toHaveProperty("deletedFiles");
			expect(deleteResponse.body.data).toHaveProperty("tagObject");
		});

		it("should handle decryption of non-existent tag", async () => {
			const decryptData = {
				tagName: "nonexistent_tag_12345",
				domain: sampleDomain,
				faceBase64: sampleFaceFromJSON.faceBase64,
				os: "DESKTOP",
				password: "testpassword123",
				removePGP: true,
			};

			const decryptResponse = await request(API_BASE_URL)
				.post("/api/tags/decrypt")
				.set("Origin", "https://test.example.com")
				.set("Authorization", `Bearer ${authToken}`)
				.send(decryptData);

			// Should return error for non-existent tag
			expect([404, 409, 500]).toContain(decryptResponse.status);
			expect(decryptResponse.body.error || decryptResponse.body.validationError).toBeDefined();

			console.log(`✅ Non-existent tag test passed`);
		});

		it("should handle decryption with missing parameters", async () => {
			// Test missing tagName
			const decryptDataMissingTag = {
				domain: sampleDomain,
				faceBase64: sampleFaceFromJSON.faceBase64,
				os: "DESKTOP",
				password: "testpassword123",
				removePGP: true,
			};

			const responseMissingTag = await request(API_BASE_URL)
				.post("/api/tags/decrypt")
				.set("Origin", "https://test.example.com")
				.set("Authorization", `Bearer ${authToken}`)
				.send(decryptDataMissingTag)
				.expect(409);

			expect(responseMissingTag.body).toHaveProperty("validationError");
			expect(responseMissingTag.body.validationError).toContain("tagName");

			// Test missing domain
			const decryptDataMissingDomain = {
				tagName: "test",
				faceBase64: sampleFaceFromJSON.faceBase64,
				os: "DESKTOP",
				password: "testpassword123",
				removePGP: true,
			};

			const responseMissingDomain = await request(API_BASE_URL)
				.post("/api/tags/decrypt")
				.set("Origin", "https://test.example.com")
				.set("Authorization", `Bearer ${authToken}`)
				.send(decryptDataMissingDomain)
				.expect(409);

			expect(responseMissingDomain.body).toHaveProperty("validationError");
			expect(responseMissingDomain.body.validationError).toContain("domain");

			// Test missing faceBase64
			const decryptDataMissingFace = {
				tagName: "test",
				domain: sampleDomain,
				password: "testpassword123",
			};

			const responseMissingFace = await request(API_BASE_URL)
				.post("/api/tags/decrypt")
				.set("Origin", "https://test.example.com")
				.set("Authorization", `Bearer ${authToken}`)
				.send(decryptDataMissingFace)
				.expect(409);

			expect(responseMissingFace.body).toHaveProperty("validationError");
			expect(responseMissingFace.body.validationError).toContain("faceBase64");

			console.log(`✅ Missing parameters validation test passed`);
		});

		it("should handle unauthorized access", async () => {
			const decryptData = {
				tagName: "test",
				domain: sampleDomain,
				faceBase64: sampleFaceFromJSON.faceBase64,
				os: "DESKTOP",
				password: "testpassword123",
				removePGP: true,
			};

			const response = await request(API_BASE_URL)
				.post("/api/tags/decrypt")
				.set("Origin", "https://test.example.com")
				// Authorization header is intentionally missing
				.send(decryptData)
				.expect(401);

			expect(response.body).toHaveProperty("error");

			console.log(`✅ Unauthorized access test passed`);
		});
	});
});
