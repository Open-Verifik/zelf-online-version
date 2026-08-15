// HumanAuthn raw API — ZelfEncrypt v4 (`/api/human-authn`), clone of `/api/zelf-proof`
const request = require("supertest");
require("dotenv").config();

const API_BASE_URL = `http://localhost:${process.env.PORT || 3000}`;
const HUMAN_AUTHN_PATH = "/api/human-authn";

describe("HumanAuthn API (v4 raw encrypt)", () => {
    it("GET /human-authn/payment-stats — should respond without payment", async () => {
        const response = await request(API_BASE_URL)
            .get(`${HUMAN_AUTHN_PATH}/payment-stats`)
            .set("Origin", "https://test.example.com");

        expect([200, 500]).toContain(response.status);
        if (response.status === 200) {
            expect(response.body).toBeDefined();
        }
    });

    it("POST /human-authn/encrypt — should require payment when unauthenticated", async () => {
        const response = await request(API_BASE_URL)
            .post(`${HUMAN_AUTHN_PATH}/encrypt`)
            .set("Origin", "https://test.example.com")
            .send({
                faceBase64: "dGVzdA==",
                metadata: { k: "v" },
                identifier: "human-authn-test",
                os: "DESKTOP",
                livenessLevel: "REGULAR",
            });

        expect(response.status).toBe(402);
        expect(response.body).toHaveProperty("error");
    });

    it("POST /human-authn/decrypt — should require payment when unauthenticated", async () => {
        const response = await request(API_BASE_URL)
            .post(`${HUMAN_AUTHN_PATH}/decrypt`)
            .set("Origin", "https://test.example.com")
            .send({
                faceBase64: "dGVzdA==",
                zelfProof: "dGVzdA==",
                os: "DESKTOP",
            });

        expect(response.status).toBe(402);
    });

    it("POST /human-authn/preview — should require payment when unauthenticated", async () => {
        const response = await request(API_BASE_URL)
            .post(`${HUMAN_AUTHN_PATH}/preview`)
            .set("Origin", "https://test.example.com")
            .send({
                zelfProof: "dGVzdA==",
            });

        expect(response.status).toBe(402);
    });
});
