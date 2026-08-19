const request = require("supertest");
require("dotenv").config();

const API_BASE_URL = `http://localhost:${process.env.PORT || 3000}`;
const ZSEND_PATH = "/api/zsend";
const MY_ZSEND_PATH = "/api/my-zsend";
const ORIGIN = "https://test.example.com";

const uniqueTagName = () => `zsend_test_${Date.now()}_${Math.random().toString(36).substring(7)}.zelf`;

const validEnvelope = (toTagName) => ({
	toTagName,
	encryptedKey: Buffer.alloc(64).toString("base64"),
	cipher: {
		algorithm: "AES-GCM-256",
		iv: Buffer.alloc(12).toString("base64"),
		cid: "QmZSendIntegrationTestCid",
		sha256: Buffer.alloc(32).toString("base64"),
		byteLength: 1024,
	},
});

describe("zSend API", () => {
	let authToken;

	beforeAll(async () => {
		const sessionResponse = await request(API_BASE_URL)
			.post("/api/sessions")
			.set("Origin", ORIGIN)
			.send({
				identifier: `zsend_test_${Date.now()}_${Math.random().toString(36).substring(7)}`,
				type: "createWallet",
				isWebExtension: false,
			});

		expect(sessionResponse.status).toBe(200);
		authToken = sessionResponse.body.data.token;
		expect(authToken).toBeDefined();
	});

	const auth = (req) => req.set("Origin", ORIGIN).set("Authorization", `Bearer ${authToken}`);

	describe("Auth — every route sits behind koa-jwt", () => {
		it.each([
			["GET", `${ZSEND_PATH}/purpose-id?tagName=alice.zelf`],
			["GET", `${ZSEND_PATH}/certificates?tagName=alice.zelf`],
			["GET", `${MY_ZSEND_PATH}/certificates`],
			["POST", `${MY_ZSEND_PATH}/certificates`],
			["POST", `${MY_ZSEND_PATH}/blobs`],
			["GET", `${MY_ZSEND_PATH}/envelopes`],
			["POST", `${MY_ZSEND_PATH}/envelopes`],
			["GET", `${MY_ZSEND_PATH}/envelopes/does-not-exist`],
		])("%s %s without a JWT is 401", async (method, path) => {
			const response = await request(API_BASE_URL)[method.toLowerCase()](path).set("Origin", ORIGIN).send({});

			expect(response.status).toBe(401);
		});
	});

	describe("GET /api/zsend/purpose-id — the convention clients must not hardcode", () => {
		it("derives zsend:<name> for a file transfer", async () => {
			const response = await auth(request(API_BASE_URL).get(`${ZSEND_PATH}/purpose-id`).query({ tagName: "alice" }));

			expect(response.status).toBe(200);
			expect(response.body.data).toMatchObject({
				tagName: "alice.zelf",
				domain: "zelf",
				kind: "file",
				purposeId: "zsend:alice.zelf",
			});
		});

		it("derives zmail:<name> for a message, so Mail reuses the envelope with its own keys", async () => {
			const response = await auth(
				request(API_BASE_URL).get(`${ZSEND_PATH}/purpose-id`).query({ tagName: "alice.zelf", kind: "message" })
			);

			expect(response.status).toBe(200);
			expect(response.body.data.purposeId).toBe("zmail:alice.zelf");
		});

		it("reports the content key window that ZelfEncrypt v4 encrypt accepts", async () => {
			const response = await auth(request(API_BASE_URL).get(`${ZSEND_PATH}/purpose-id`).query({ tagName: "alice" }));

			expect(response.status).toBe(200);
			expect(response.body.data.contentKeyMinBytes).toBe(32);
			expect(response.body.data.contentKeyMaxBytes).toBe(512);
			expect(response.body.data.cipherAlgorithms).toContain("AES-GCM-256");
		});

		it("requires tagName", async () => {
			const response = await auth(request(API_BASE_URL).get(`${ZSEND_PATH}/purpose-id`));

			expect(response.status).toBe(409);
			expect(response.body).toHaveProperty("validationError");
		});

		it("rejects an unsupported kind", async () => {
			const response = await auth(request(API_BASE_URL).get(`${ZSEND_PATH}/purpose-id`).query({ tagName: "alice", kind: "video" }));

			expect(response.status).toBe(409);
		});
	});

	describe("GET /api/zsend/certificates — sender lookup", () => {
		it("is 404 for a name that never published", async () => {
			const response = await auth(request(API_BASE_URL).get(`${ZSEND_PATH}/certificates`).query({ tagName: uniqueTagName() }));

			expect(response.status).toBe(404);
			expect(response.body.message).toBe("certificate_not_published");
		});

		it("requires tagName", async () => {
			const response = await auth(request(API_BASE_URL).get(`${ZSEND_PATH}/certificates`));

			expect(response.status).toBe(409);
		});
	});

	describe("POST /api/my-zsend/certificates — publish", () => {
		it("requires a certificate", async () => {
			const response = await auth(request(API_BASE_URL).post(`${MY_ZSEND_PATH}/certificates`)).send({ tagName: uniqueTagName() });

			expect(response.status).toBe(409);
			expect(response.body).toHaveProperty("validationError");
		});

		it("requires tagName", async () => {
			const response = await auth(request(API_BASE_URL).post(`${MY_ZSEND_PATH}/certificates`)).send({ certificate: "x" });

			expect(response.status).toBe(409);
		});

		it("rejects a value that is not a PEM certificate before calling the Face PKI", async () => {
			const response = await auth(request(API_BASE_URL).post(`${MY_ZSEND_PATH}/certificates`)).send({
				tagName: uniqueTagName(),
				certificate: "definitely-not-a-pem",
			});

			expect(response.status).toBe(409);
			expect(response.body.message).toBe("invalid_certificate");
		});

		it("refuses a self-signed certificate the Face PKI root did not sign", async () => {
			const response = await auth(request(API_BASE_URL).post(`${MY_ZSEND_PATH}/certificates`)).send({
				tagName: uniqueTagName(),
				certificate: "-----BEGIN CERTIFICATE-----\nMIIBaGVsbG8gd29ybGQ=\n-----END CERTIFICATE-----\n",
			});

			// Never published: either zSend rejected it, or the upstream verify call refused it.
			expect(response.status).not.toBe(200);
			expect([400, 409, 422, 500, 502]).toContain(response.status);
		});
	});

	describe("GET /api/my-zsend/certificates — my directory entries", () => {
		it("returns an empty list for a fresh session", async () => {
			const response = await auth(request(API_BASE_URL).get(`${MY_ZSEND_PATH}/certificates`));

			expect(response.status).toBe(200);
			expect(Array.isArray(response.body.data)).toBe(true);
			expect(response.body.data).toHaveLength(0);
		});
	});

	describe("DELETE /api/my-zsend/certificates — revoke", () => {
		it("is 404 when nothing was published for that name", async () => {
			const response = await auth(request(API_BASE_URL).delete(`${MY_ZSEND_PATH}/certificates`)).send({ tagName: uniqueTagName() });

			expect(response.status).toBe(404);
			expect(response.body.message).toBe("certificate_not_published");
		});
	});

	describe("POST /api/my-zsend/envelopes — send", () => {
		it("refuses to send to a name with no published certificate", async () => {
			const response = await auth(request(API_BASE_URL).post(`${MY_ZSEND_PATH}/envelopes`)).send(validEnvelope(uniqueTagName()));

			expect(response.status).toBe(404);
			expect(response.body.message).toBe("recipient_certificate_not_published");
		});

		it("requires the wrapped key", async () => {
			const payload = validEnvelope(uniqueTagName());
			delete payload.encryptedKey;

			const response = await auth(request(API_BASE_URL).post(`${MY_ZSEND_PATH}/envelopes`)).send(payload);

			expect(response.status).toBe(409);
			expect(response.body).toHaveProperty("validationError");
		});

		it("requires the AEAD nonce", async () => {
			const payload = validEnvelope(uniqueTagName());
			delete payload.cipher.iv;

			const response = await auth(request(API_BASE_URL).post(`${MY_ZSEND_PATH}/envelopes`)).send(payload);

			expect(response.status).toBe(409);
			expect(response.body).toHaveProperty("validationError");
		});

		it("rejects a non-AEAD cipher", async () => {
			const payload = validEnvelope(uniqueTagName());
			payload.cipher.algorithm = "AES-CBC-256";

			const response = await auth(request(API_BASE_URL).post(`${MY_ZSEND_PATH}/envelopes`)).send(payload);

			expect(response.status).toBe(409);
			expect(response.body).toHaveProperty("validationError");
		});

		it("rejects a TTL beyond the supported window", async () => {
			const payload = validEnvelope(uniqueTagName());
			payload.expiresInHours = 100000;

			const response = await auth(request(API_BASE_URL).post(`${MY_ZSEND_PATH}/envelopes`)).send(payload);

			expect(response.status).toBe(409);
			expect(response.body).toHaveProperty("validationError");
		});

		it("rejects an oversized wrapped key", async () => {
			const payload = validEnvelope(uniqueTagName());
			payload.encryptedKey = Buffer.alloc(64 * 1024).toString("base64");

			const response = await auth(request(API_BASE_URL).post(`${MY_ZSEND_PATH}/envelopes`)).send(payload);

			expect(response.status).toBe(413);
			expect(response.body.message).toBe("encryptedKey_too_large");
		});

		it("has no parameter for a raw content key or plaintext", async () => {
			// Zero-access by construction: these extra keys are ignored, never stored.
			const payload = {
				...validEnvelope(uniqueTagName()),
				keyBase64: Buffer.alloc(32).toString("base64"),
				plaintext: "secret",
			};

			const response = await auth(request(API_BASE_URL).post(`${MY_ZSEND_PATH}/envelopes`)).send(payload);

			// Still stops at the missing recipient certificate, not at the ignored fields.
			expect(response.status).toBe(404);
			expect(response.body.message).toBe("recipient_certificate_not_published");
		});
	});

	describe("GET /api/my-zsend/envelopes — inbox and outbox", () => {
		it("returns an empty outbox for a fresh session", async () => {
			const response = await auth(request(API_BASE_URL).get(`${MY_ZSEND_PATH}/envelopes`).query({ box: "outbox" }));

			expect(response.status).toBe(200);
			expect(response.body.data).toHaveLength(0);
		});

		it("defaults to the outbox", async () => {
			const response = await auth(request(API_BASE_URL).get(`${MY_ZSEND_PATH}/envelopes`));

			expect(response.status).toBe(200);
			expect(Array.isArray(response.body.data)).toBe(true);
		});

		it("has no inbox until a certificate claims a name", async () => {
			const response = await auth(request(API_BASE_URL).get(`${MY_ZSEND_PATH}/envelopes`).query({ box: "inbox" }));

			expect(response.status).toBe(409);
			expect(response.body.message).toBe("no_published_certificate_for_inbox");
		});

		it("rejects an unknown box", async () => {
			const response = await auth(request(API_BASE_URL).get(`${MY_ZSEND_PATH}/envelopes`).query({ box: "archive" }));

			expect(response.status).toBe(409);
			expect(response.body).toHaveProperty("validationError");
		});
	});

	describe("GET /api/my-zsend/envelopes/:envelopeId — open", () => {
		it("is 404 for an unknown envelope", async () => {
			const response = await auth(request(API_BASE_URL).get(`${MY_ZSEND_PATH}/envelopes/00000000-0000-0000-0000-000000000000`));

			expect(response.status).toBe(404);
			expect(response.body.message).toBe("envelope_not_found");
		});

		it("is 404 when marking an unknown envelope opened", async () => {
			const response = await auth(
				request(API_BASE_URL).post(`${MY_ZSEND_PATH}/envelopes/00000000-0000-0000-0000-000000000000/opened`)
			).send({});

			expect(response.status).toBe(404);
		});

		it("is 404 when revoking an unknown envelope", async () => {
			const response = await auth(request(API_BASE_URL).delete(`${MY_ZSEND_PATH}/envelopes/00000000-0000-0000-0000-000000000000`));

			expect(response.status).toBe(404);
		});
	});

	describe("POST /api/my-zsend/blobs — ciphertext pinning", () => {
		it("requires cipherBase64", async () => {
			const response = await auth(request(API_BASE_URL).post(`${MY_ZSEND_PATH}/blobs`)).send({});

			expect(response.status).toBe(409);
			expect(response.body).toHaveProperty("validationError");
		});
	});
});
