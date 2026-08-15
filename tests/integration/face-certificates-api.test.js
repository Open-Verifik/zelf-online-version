const request = require("supertest");
const fs = require("fs");
const path = require("path");
require("dotenv").config();

const API_BASE_URL = `http://localhost:${process.env.PORT || 3000}`;
const PAID_PATH = "/api/face-certificates";
const JWT_PATH = "/api/my-face-certificates";
const ORIGIN = "https://test.example.com";

const faceSamplePath = path.resolve(__dirname, "../../config/0012589021.json");
const faceSample = fs.existsSync(faceSamplePath) ? JSON.parse(fs.readFileSync(faceSamplePath, "utf8")) : {};

describe("Face Certificates API", () => {
	let authToken;

	beforeAll(async () => {
		const sessionResponse = await request(API_BASE_URL)
			.post("/api/sessions")
			.set("Origin", ORIGIN)
			.send({
				identifier: `face_cert_test_${Date.now()}_${Math.random().toString(36).substring(7)}`,
				type: "createWallet",
				isWebExtension: false,
			});

		expect(sessionResponse.status).toBe(200);
		authToken = sessionResponse.body.data.token;
		expect(authToken).toBeDefined();
	});

	describe("Set A — /api/face-certificates (402)", () => {
		it("GET /root-certificate — returns PEM without payment", async () => {
			const response = await request(API_BASE_URL).get(`${PAID_PATH}/root-certificate`).set("Origin", ORIGIN);

			expect(response.status).toBe(200);
			const pem = response.body.rootCertificate || "";
			expect(pem).toContain("BEGIN CERTIFICATE");
		});

		it("POST /generate — requires payment when unauthenticated", async () => {
			const response = await request(API_BASE_URL)
				.post(`${PAID_PATH}/generate`)
				.set("Origin", ORIGIN)
				.send({
					faceBase64: "dGVzdA==",
					zelfProof: "dGVzdA==",
					purposeId: "test:face-certificates",
					userSubjectName: "test@example.com",
					expirationDateUtc: "2034-10-01T00:00:00Z",
				});

			expect(response.status).toBe(402);
			expect(response.body).toHaveProperty("error");
		});

		it("POST /verify — requires payment when unauthenticated", async () => {
			const response = await request(API_BASE_URL)
				.post(`${PAID_PATH}/verify`)
				.set("Origin", ORIGIN)
				.send({ certificate: "-----BEGIN CERTIFICATE-----\nMIIB\n-----END CERTIFICATE-----" });

			expect(response.status).toBe(402);
		});

		it("POST /generate — validation failure is 409 after payment headers are missing still 402 first", async () => {
			const response = await request(API_BASE_URL).post(`${PAID_PATH}/generate`).set("Origin", ORIGIN).send({});

			expect(response.status).toBe(402);
		});
	});

	describe("Set B — /api/my-face-certificates (JWT, no 402)", () => {
		it("POST /generate without JWT — 401", async () => {
			const response = await request(API_BASE_URL)
				.post(`${JWT_PATH}/generate`)
				.set("Origin", ORIGIN)
				.send({
					faceBase64: "dGVzdA==",
					zelfProof: "dGVzdA==",
					purposeId: "test:face-certificates",
					userSubjectName: "test@example.com",
					expirationDateUtc: "2034-10-01T00:00:00Z",
				});

			expect(response.status).toBe(401);
		});

		it("POST /generate with JWT and empty body — 409", async () => {
			const response = await request(API_BASE_URL)
				.post(`${JWT_PATH}/generate`)
				.set("Origin", ORIGIN)
				.set("Authorization", `Bearer ${authToken}`)
				.send({});

			expect(response.status).toBe(409);
			expect(response.body).toHaveProperty("validationError");
		});

		it("POST /generate with JWT is not 402", async () => {
			const response = await request(API_BASE_URL)
				.post(`${JWT_PATH}/generate`)
				.set("Origin", ORIGIN)
				.set("Authorization", `Bearer ${authToken}`)
				.send({
					faceBase64: faceSample.faceBase64 || "dGVzdA==",
					zelfProof: "dGVzdA==",
					purposeId: "test:face-certificates",
					userSubjectName: "test@example.com",
					expirationDateUtc: "2034-10-01T00:00:00Z",
					os: "DESKTOP",
				});

			expect(response.status).not.toBe(402);
			expect(response.status).not.toBe(401);
			expect([200, 400, 422, 500]).toContain(response.status);
		});
	});
});
