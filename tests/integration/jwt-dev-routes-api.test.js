// Development-only JWT mirrors of /api/zelf-proof and /api/human-authn.
// Hits a live server. Routes exist only when the API process has NODE_ENV=development.
const request = require("supertest");
const fs = require("fs");
const path = require("path");
require("dotenv").config();

const API_BASE_URL = `http://localhost:${process.env.PORT || 3000}`;
const ORIGIN = "https://test.example.com";
const JWT_ZELF_PROOF = "/api/jwt/zelf-proof";
const JWT_HUMAN_AUTHN = "/api/jwt/human-authn";
const PAID_ZELF_PROOF = "/api/zelf-proof";

const faceSamplePath = path.resolve(__dirname, "../../config/0012589021.json");
const faceSample = JSON.parse(fs.readFileSync(faceSamplePath, "utf8"));

const encryptBody = (identifier) => ({
    faceBase64: faceSample.faceBase64,
    metadata: { source: "jwt-dev-routes-test" },
    identifier,
    os: "DESKTOP",
    livenessLevel: "REGULAR",
    requireLiveness: false,
});

describe("JWT development routes (no ZNS payment)", () => {
    let authToken;

    beforeAll(async () => {
        const sessionResponse = await request(API_BASE_URL)
            .post("/api/sessions")
            .set("Origin", ORIGIN)
            .send({
                identifier: `jwt_dev_test_${Date.now()}_${Math.random().toString(36).substring(7)}`,
                type: "createWallet",
                isWebExtension: false,
            });

        expect(sessionResponse.status).toBe(200);
        authToken = sessionResponse.body.data.token;
        expect(authToken).toBeDefined();
    });

    describe("auth gates", () => {
        it("POST /api/jwt/zelf-proof/encrypt without JWT — 401, never 402", async () => {
            const response = await request(API_BASE_URL)
                .post(`${JWT_ZELF_PROOF}/encrypt`)
                .set("Origin", ORIGIN)
                .send(encryptBody(`jwt_dev_unauth_${Date.now()}`));

            expect(response.status).toBe(401);
            expect(response.status).not.toBe(402);
        });

        it("POST /api/jwt/human-authn/encrypt without JWT — 401, never 402", async () => {
            const response = await request(API_BASE_URL)
                .post(`${JWT_HUMAN_AUTHN}/encrypt`)
                .set("Origin", ORIGIN)
                .send(encryptBody(`jwt_dev_ha_unauth_${Date.now()}`));

            expect(response.status).toBe(401);
            expect(response.status).not.toBe(402);
        });

        it("POST /api/zelf-proof/encrypt unauthenticated still requires payment", async () => {
            const response = await request(API_BASE_URL)
                .post(`${PAID_ZELF_PROOF}/encrypt`)
                .set("Origin", ORIGIN)
                .send(encryptBody(`paid_path_${Date.now()}`));

            expect(response.status).toBe(402);
            expect(response.body).toHaveProperty("error");
        });
    });

    describe("POST /api/jwt/zelf-proof (JWT, no payment headers)", () => {
        let zelfProof;

        it("encrypt with JWT is not 402 and returns a proof", async () => {
            const response = await request(API_BASE_URL)
                .post(`${JWT_ZELF_PROOF}/encrypt`)
                .set("Origin", ORIGIN)
                .set("Authorization", `Bearer ${authToken}`)
                .send(encryptBody(`jwt_dev_zp_${Date.now()}`));

            expect(response.status).not.toBe(402);
            expect(response.status).not.toBe(401);
            expect(response.status).toBe(200);
            expect(response.body).toHaveProperty("zelfProof");
            expect(typeof response.body.zelfProof).toBe("string");
            zelfProof = response.body.zelfProof;
        });

        it("preview with JWT uses the encrypted proof and is not 402", async () => {
            expect(zelfProof).toBeDefined();

            const response = await request(API_BASE_URL)
                .post(`${JWT_ZELF_PROOF}/preview`)
                .set("Origin", ORIGIN)
                .set("Authorization", `Bearer ${authToken}`)
                .send({ zelfProof });

            expect(response.status).not.toBe(402);
            expect(response.status).not.toBe(401);
            expect(response.status).toBe(200);
            expect(response.body).toBeDefined();
        });

        it("encrypt with JWT and empty body — 409", async () => {
            const response = await request(API_BASE_URL)
                .post(`${JWT_ZELF_PROOF}/encrypt`)
                .set("Origin", ORIGIN)
                .set("Authorization", `Bearer ${authToken}`)
                .send({});

            expect(response.status).toBe(409);
            expect(response.body).toHaveProperty("validationError");
        });
    });

    describe("POST /api/jwt/human-authn (JWT, no payment headers)", () => {
        let zelfProof;

        it("encrypt with JWT is not 402 and returns a proof", async () => {
            const response = await request(API_BASE_URL)
                .post(`${JWT_HUMAN_AUTHN}/encrypt`)
                .set("Origin", ORIGIN)
                .set("Authorization", `Bearer ${authToken}`)
                .send(encryptBody(`jwt_dev_ha_${Date.now()}`));

            expect(response.status).not.toBe(402);
            expect(response.status).not.toBe(401);
            expect(response.status).toBe(200);
            expect(response.body).toHaveProperty("zelfID");
            expect(typeof response.body.zelfID).toBe("string");
            zelfProof = response.body.zelfID;
        });

        it("preview with JWT uses the encrypted proof and is not 402", async () => {
            expect(zelfProof).toBeDefined();

            const response = await request(API_BASE_URL)
                .post(`${JWT_HUMAN_AUTHN}/preview`)
                .set("Origin", ORIGIN)
                .set("Authorization", `Bearer ${authToken}`)
                .send({ zelfProof });

            expect(response.status).not.toBe(402);
            expect(response.status).not.toBe(401);
            expect(response.status).toBe(200);
            expect(response.body).toBeDefined();
        });
    });
});
