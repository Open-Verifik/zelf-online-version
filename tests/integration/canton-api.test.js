// Canton API HTTP tests — live Koa server, no mocks.
// Auth/validation/party-gate only; does not call a Canton validator.
const request = require("supertest");
require("dotenv").config({ path: require("path").resolve(__dirname, "../../.env") });

const API_BASE_URL = `http://localhost:${process.env.PORT || 3050}`;
const ORIGIN = "https://test.example.com";
const VALID_PARTY_ID = `qa-party::1220${"a".repeat(64)}`;

describe("Canton API Integration Tests - Real Server", () => {
    let authToken;

    beforeAll(async () => {
        const sessionResponse = await request(API_BASE_URL)
            .post("/api/sessions")
            .set("Origin", ORIGIN)
            .send({
                identifier: `canton_test_${Date.now()}_${Math.random().toString(36).substring(7)}`,
                type: "general",
                isWebExtension: false,
            })
            .expect(200);

        authToken = sessionResponse.body.data.token;
        expect(authToken).toBeDefined();
    });

    describe("GET /api/canton/status", () => {
        it("returns 401 without a JWT", async () => {
            const response = await request(API_BASE_URL).get("/api/canton/status").set("Origin", ORIGIN);

            expect(response.status).toBe(401);
        });

        it("returns a sanitized status object with a session JWT", async () => {
            const response = await request(API_BASE_URL)
                .get("/api/canton/status")
                .set("Origin", ORIGIN)
                .set("Authorization", `Bearer ${authToken}`);

            expect(response.status).toBe(200);
            expect(response.body).toHaveProperty("data");
            expect(response.body.data).toHaveProperty("network");
            expect(response.body.data).toHaveProperty("authMethod");
            expect(response.body.data).toHaveProperty("configured");
            expect(response.body.data).toHaveProperty("authorization");
            expect(response.body.data.signing).toEqual({
                mode: "external",
                backendAcceptsMnemonicOrPrivateKey: false,
            });
            expect(response.body.data).not.toHaveProperty("authClientSecret");
            expect(response.body.data).not.toHaveProperty("staticToken");
            expect(response.body.data).not.toHaveProperty("authClientId");
            expect(Array.isArray(response.body.data.missing)).toBe(true);
        });
    });

    describe("GET /api/canton/address/:id", () => {
        it("returns 400 for a malformed party id", async () => {
            const response = await request(API_BASE_URL)
                .get("/api/canton/address/not-a-party")
                .set("Origin", ORIGIN)
                .set("Authorization", `Bearer ${authToken}`);

            expect(response.status).toBe(400);
            expect(response.body.code).toBe("canton_party_id_invalid");
        });

        it("returns 403 for a well-formed party that is not on the allowlist", async () => {
            const statusResponse = await request(API_BASE_URL)
                .get("/api/canton/status")
                .set("Origin", ORIGIN)
                .set("Authorization", `Bearer ${authToken}`)
                .expect(200);

            if (statusResponse.body.data.authorization.mode === "unbound-development") {
                console.warn("Skipping allowlist 403: CANTON_ALLOW_UNBOUND_PARTIES is enabled");
                return;
            }

            const response = await request(API_BASE_URL)
                .get(`/api/canton/address/${VALID_PARTY_ID}`)
                .set("Origin", ORIGIN)
                .set("Authorization", `Bearer ${authToken}`);

            expect(response.status).toBe(403);
            expect(response.body.code).toBe("canton_party_not_authorized");
        });
    });

    describe("POST /api/canton/transfer/prepare", () => {
        it("returns 409 when sender and amountCc are missing", async () => {
            const response = await request(API_BASE_URL)
                .post("/api/canton/transfer/prepare")
                .set("Origin", ORIGIN)
                .set("Authorization", `Bearer ${authToken}`)
                .send({ recipient: VALID_PARTY_ID });

            expect(response.status).toBe(409);
            expect(response.body).toHaveProperty("validationError");
        });
    });

    describe("POST /api/canton/transfer/submit", () => {
        it("returns 409 when signature is missing", async () => {
            const response = await request(API_BASE_URL)
                .post("/api/canton/transfer/submit")
                .set("Origin", ORIGIN)
                .set("Authorization", `Bearer ${authToken}`)
                .send({
                    partyId: VALID_PARTY_ID,
                    preparedTransaction: {
                        preparedTransaction: "dGVzdA==",
                        preparedTransactionHash: "abc",
                    },
                });

            expect(response.status).toBe(409);
            expect(response.body).toHaveProperty("validationError");
        });
    });
});
