// Lease Offline API Integration Tests - Testing Real Running Server
// This test works with the actual running server on port 3003
const request = require("supertest");

// Test against the actual running server
const API_BASE_URL = "http://localhost:3003";

// Sample ZelfProof data for testing
const sampleZelfProof =
	"AtxfV40bK7VSB4fDl5QMUcjcIdOu4ZQ6Oq8duuz1UXsqhpIgSZ320S13DlqkH9y6FeSwJarYmYKaujP37H9fYzNlpgjP6nMKNJDTyiNkpJyLMsocnaOu5j395t0KouvFJQZ4wYyAFVWyZXbcLk2QNAP0+sHW4zyYwY71TpSoddnFYw1JxC417SgzypbEMBUjzr1DfC0AVISowe3wdGBmf821F5PBIljCWJ2wyG9zg5vF2cMtKa3Dk74s+sC/ykQoufMFKkOWpGd0p/TplVQILJW8kBAHkLfX45Z2RmuKxU+DSf/obws0sKNc9TcOfEeGuzDCVOkxH9StycOXfP5up7ftu2WMFPA0M5drTj80u1he+okdnRA53FaqbKhwLroZm4DOJxeGuz7rb1IdeJ8VtNE5CRfKMncVxBW36VoMvHF+ZEyNnUoOUX6ngq0/izY5fm2HlKcUurvHkKxpTz/0qNeicSge2FDjLe5Q0t7MI6KrmfMWlUTF+Ii9tytIyluLFqMG016ggLlxKVA9AIslWVRmZONQiz/JIIFxq6PTnrdu4nb1weX7B0VzkgBPt6HhMPcFXOC6BRq+r63NOaLqIj6oS6lYT74KyuQjqI2BqYBkp3Z6P7tPgw6d/ICw4dAmB0AJV0kbUNEo7KDNcbfiK4gfTRKf4WDYZpLNGGJPj2EeoJ3ajX2pacPDusxf+S/T2+cw51R9RFRUkhYzxrHtSqOllx8T1HHdxT1Q0QpT2szPlh60qXBWbBxGJo8rHwSuc+he0YeY3TA4JdbRpaFqhnYM7UZFnYC0YZNs8bpW1gvnnNYvSLIqycSJbWFIq7ZwPy8miO4Drb7v2IIHZCKTy57qWHIb2JHtfoh0e+Z8/VTxCtzJq2WwP73zEVL32wVY4tV+8tWE8HRYW+nAsf9aw42dpB9xwlrxVCUKSqUv9KP5cKBAJKQDNnKzgdwgBijsaKRfx1wL10PBcKt65e/M1TT1Mzuyajd99dhqdiHUu8RcciCpxujuezEFLxOfW8qdYDgBJXRuakyqaJ3apdLIsiOwhhnTLouHVzJvxhh2SMpRQ8J0SbDjNL6wfCKe54FR1D+PHeuHSOTKNJMHY3fD4Zo3Uy74TWFPRs2wkp3+GA1kNC0YJp/1rvp044yW697rCdW8F12atb8zK/0MLC3nr2CcicGZ9ZcFMhdi5jEX93ScM69Qds9Ms98rZ1yDzohrANXqNt/cnigEZ9MnMhzJCrCunCC9aaBzEQSYGwUfNK+rydG2OVLVaXPQRZyvwTy92AnrceHXwA==";

const sampleZelfProofQRCode =
	"data:image/png;base64,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";

describe("Lease Offline API Integration Tests - Real Server", () => {
	let authToken;

	// Create a session and get JWT token before running tests
	beforeAll(async () => {
		const sessionData = {
			identifier: `lease_offline_test_session_${Date.now()}_${Math.random().toString(36).substring(7)}`,
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

	describe("POST /api/tags/lease-offline - Lease Tag Offline", () => {
		it("should return error for invalid ZelfProof data", async () => {
			const leaseData = {
				tagName: `offlinetest${Date.now()}`,
				domain: "zelf",
				zelfProofQRCode: "data:image/png;base64,invalid_data",
			};

			const response = await request(API_BASE_URL)
				.post("/api/tags/lease-offline")
				.set("Origin", "https://test.example.com")
				.set("Authorization", `Bearer ${authToken}`)
				.send(leaseData);

			expect(response.status).toBe(500);
			expect(response.body).toHaveProperty("error");
			expect(response.body.error).toContain("INVALID REQUEST");
		});

		it("should return validation error when tagName is missing", async () => {
			const leaseData = {
				// tagName is intentionally missing
				domain: "zelf",
				zelfProof: sampleZelfProof,
				zelfProofQRCode: sampleZelfProofQRCode,
			};

			const response = await request(API_BASE_URL)
				.post("/api/tags/lease-offline")
				.set("Origin", "https://test.example.com")
				.set("Authorization", `Bearer ${authToken}`)
				.send(leaseData);

			expect(response.status).toBe(409);
			expect(response.body).toHaveProperty("validationError");
			expect(response.body.validationError).toContain("tagName");
		});

		it("should return validation error when domain is missing", async () => {
			const leaseData = {
				tagName: `offlinetest${Date.now()}`,
				// domain is intentionally missing
				zelfProof: sampleZelfProof,
				zelfProofQRCode: sampleZelfProofQRCode,
			};

			const response = await request(API_BASE_URL)
				.post("/api/tags/lease-offline")
				.set("Origin", "https://test.example.com")
				.set("Authorization", `Bearer ${authToken}`)
				.send(leaseData);

			expect(response.status).toBe(409);
			expect(response.body).toHaveProperty("validationError");
			expect(response.body.validationError).toContain("domain");
		});

		it("should return validation error when zelfProofQRCode is missing", async () => {
			const leaseData = {
				tagName: `offlinetest${Date.now()}`,
				domain: "zelf",
				zelfProof: sampleZelfProof,
				// zelfProofQRCode is intentionally missing
			};

			const response = await request(API_BASE_URL)
				.post("/api/tags/lease-offline")
				.set("Origin", "https://test.example.com")
				.set("Authorization", `Bearer ${authToken}`)
				.send(leaseData);

			expect(response.status).toBe(409);
			expect(response.body).toHaveProperty("validationError");
			expect(response.body.validationError).toContain("zelfProofQRCode");
		});

		it("should return unauthorized error when JWT token is missing", async () => {
			const leaseData = {
				tagName: `offlinetest${Date.now()}`,
				domain: "zelf",
				zelfProof: sampleZelfProof,
				zelfProofQRCode: sampleZelfProofQRCode,
			};

			const response = await request(API_BASE_URL)
				.post("/api/tags/lease-offline")
				.set("Origin", "https://test.example.com")
				// Authorization header is intentionally missing
				.send(leaseData);

			expect(response.status).toBe(401);
			expect(response.body).toHaveProperty("error");
		});

		it("should handle different domains with invalid data", async () => {
			const domains = ["zelf", "avax", "bdag"];

			for (const domain of domains) {
				const leaseData = {
					tagName: `test${domain}${Date.now().toString().slice(-6)}`,
					domain: domain,
					zelfProofQRCode: "data:image/png;base64,invalid_data",
				};

				const response = await request(API_BASE_URL)
					.post("/api/tags/lease-offline")
					.set("Origin", "https://test.example.com")
					.set("Authorization", `Bearer ${authToken}`)
					.send(leaseData);

				// Should return either 409 (validation/tag exists) or 500 (ZelfProof error)
				expect([409, 500]).toContain(response.status);
				expect(response.body.error || response.body.validationError).toBeDefined();
			}
		});

		it("should handle sync functionality with invalid data", async () => {
			const leaseData = {
				tagName: `synctest${Date.now()}`,
				domain: "zelf",
				zelfProofQRCode: "data:image/png;base64,invalid_data",
				sync: true,
				syncPassword: "testpassword",
				syncPublicData: {
					ethAddress: "0x1234567890123456789012345678901234567890",
					btcAddress: "bc1qtest123456789012345678901234567890",
					solanaAddress: "Test1234567890123456789012345678901234567890",
					suiAddress: "0xtest1234567890123456789012345678901234567890",
				},
			};

			const response = await request(API_BASE_URL)
				.post("/api/tags/lease-offline")
				.set("Origin", "https://test.example.com")
				.set("Authorization", `Bearer ${authToken}`)
				.send(leaseData);

			expect(response.status).toBe(500);
			expect(response.body).toHaveProperty("error");
		});
	});
});
