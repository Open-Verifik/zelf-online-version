// Live 3.1.6 vs v4 encrypt/decrypt compatibility, plus HumanAuthn /upgrade.
// Face: Core/assets/selfie_girl.jpg. Hits JWT-dev routes (no ZNS payment).
const request = require("supertest");
const fs = require("fs");
const path = require("path");
require("dotenv").config();

const API_BASE_URL = `http://localhost:${process.env.PORT || 3000}`;
const ORIGIN = "https://test.example.com";
const JWT_ZELF_PROOF = "/api/jwt/zelf-proof";
const JWT_HUMAN_AUTHN = "/api/jwt/human-authn";
const PAID_HUMAN_AUTHN = "/api/human-authn";

const faceBase64 = fs.readFileSync(path.resolve(__dirname, "../../Core/assets/selfie_girl.jpg"), "base64");

const PUBLIC_DATA = {
    name: "Compat Test User",
    source: "encrypt-stack-compat",
};
const METADATA = {
    suite: "encrypt-stack-compat",
    note: "selfie_girl",
};

const uniqueId = (label) => `${label}_${Date.now()}_${Math.random().toString(36).substring(7)}`;

const encryptBody = (identifier) => ({
    faceBase64,
    publicData: PUBLIC_DATA,
    metadata: METADATA,
    identifier,
    os: "DESKTOP",
    livenessLevel: "REGULAR",
    requireLiveness: false,
});

const decryptBody = (zelfProof) => ({
    faceBase64,
    os: "DESKTOP",
    zelfProof,
});

const payloadFromDecrypt = (body = {}) => ({
    publicData: body.publicData || body.cleartext_data || body.cleartextData,
    metadata: body.metadata,
});

describe("3.1.6 / v4 encrypt compatibility and upgrade", () => {
    let authToken;

    beforeAll(async () => {
        const sessionResponse = await request(API_BASE_URL)
            .post("/api/sessions")
            .set("Origin", ORIGIN)
            .send({
                identifier: uniqueId("encrypt_compat_session"),
                type: "createWallet",
                isWebExtension: false,
            });

        expect(sessionResponse.status).toBe(200);
        authToken = sessionResponse.body.data.token;
        expect(authToken).toBeDefined();
    });

    const auth = (req) => req.set("Origin", ORIGIN).set("Authorization", `Bearer ${authToken}`);

    describe("3.1.6 full cycle (/api/jwt/zelf-proof)", () => {
        it("encrypt then decrypt returns the same publicData and metadata", async () => {
            const encryptResponse = await auth(request(API_BASE_URL).post(`${JWT_ZELF_PROOF}/encrypt`)).send(
                encryptBody(uniqueId("compat_316"))
            );

            expect(encryptResponse.status).toBe(200);
            expect(typeof encryptResponse.body.zelfProof).toBe("string");

            const decryptResponse = await auth(request(API_BASE_URL).post(`${JWT_ZELF_PROOF}/decrypt`)).send(
                decryptBody(encryptResponse.body.zelfProof)
            );

            expect(decryptResponse.status).toBe(200);
            const payload = payloadFromDecrypt(decryptResponse.body);
            expect(payload.publicData).toMatchObject(PUBLIC_DATA);
            expect(payload.metadata).toMatchObject(METADATA);
        });
    });

    describe("v4 full cycle (/api/jwt/human-authn)", () => {
        it("encrypt then decrypt returns the same publicData and metadata", async () => {
            const encryptResponse = await auth(request(API_BASE_URL).post(`${JWT_HUMAN_AUTHN}/encrypt`)).send(
                encryptBody(uniqueId("compat_v4"))
            );

            expect(encryptResponse.status).toBe(200);
            expect(typeof encryptResponse.body.zelfID).toBe("string");

            const decryptResponse = await auth(request(API_BASE_URL).post(`${JWT_HUMAN_AUTHN}/decrypt`)).send(
                decryptBody(encryptResponse.body.zelfID)
            );

            expect(decryptResponse.status).toBe(200);
            const payload = payloadFromDecrypt(decryptResponse.body);
            expect(payload.publicData).toMatchObject(PUBLIC_DATA);
            expect(payload.metadata).toMatchObject(METADATA);
        });
    });

    describe("cross-stack: 3.1.6 encrypt, v4 decrypt (no upgrade)", () => {
        it("is either compatible (200 + matching payload) or a 4xx that is not 401/402", async () => {
            const encryptResponse = await auth(request(API_BASE_URL).post(`${JWT_ZELF_PROOF}/encrypt`)).send(
                encryptBody(uniqueId("compat_cross"))
            );

            expect(encryptResponse.status).toBe(200);

            const decryptResponse = await auth(request(API_BASE_URL).post(`${JWT_HUMAN_AUTHN}/decrypt`)).send(
                decryptBody(encryptResponse.body.zelfProof)
            );

            expect(decryptResponse.status).not.toBe(401);
            expect(decryptResponse.status).not.toBe(402);
            expect(decryptResponse.status).toBeLessThan(500);

            if (decryptResponse.status === 200) {
                const payload = payloadFromDecrypt(decryptResponse.body);
                expect(payload.publicData).toMatchObject(PUBLIC_DATA);
                expect(payload.metadata).toMatchObject(METADATA);
                console.info("compat: 3.1.6 proof decrypts on v4 without upgrade");
            } else {
                expect(decryptResponse.status).toBeGreaterThanOrEqual(400);
                expect(decryptResponse.status).toBeLessThan(500);
                console.info(`compat: 3.1.6 proof does not decrypt on v4 (${decryptResponse.status})`);
            }
        });
    });

    describe("upgrade 3.1.6 → v4", () => {
        it("POST /api/jwt/human-authn/upgrade without JWT — 401", async () => {
            const response = await request(API_BASE_URL)
                .post(`${JWT_HUMAN_AUTHN}/upgrade`)
                .set("Origin", ORIGIN)
                .send(decryptBody("dGVzdA=="));

            expect(response.status).toBe(401);
            expect(response.status).not.toBe(402);
        });

        it("POST /api/jwt/human-authn/upgrade with JWT and empty body — 409", async () => {
            const response = await auth(request(API_BASE_URL).post(`${JWT_HUMAN_AUTHN}/upgrade`)).send({});

            expect(response.status).toBe(409);
            expect(response.body).toHaveProperty("validationError");
        });

        it("POST /api/human-authn/upgrade without payment — 402", async () => {
            const response = await request(API_BASE_URL)
                .post(`${PAID_HUMAN_AUTHN}/upgrade`)
                .set("Origin", ORIGIN)
                .send(decryptBody("dGVzdA=="));

            expect(response.status).toBe(402);
            expect(response.body).toHaveProperty("error");
        });

        it("upgrades a 3.1.6 proof and decrypts the v4 result", async () => {
            const encryptResponse = await auth(request(API_BASE_URL).post(`${JWT_ZELF_PROOF}/encrypt`)).send(
                encryptBody(uniqueId("compat_upgrade"))
            );

            expect(encryptResponse.status).toBe(200);

            const upgradeResponse = await auth(request(API_BASE_URL).post(`${JWT_HUMAN_AUTHN}/upgrade`)).send({
                ...decryptBody(encryptResponse.body.zelfProof),
                requireLiveness: false,
            });

            expect(upgradeResponse.status).not.toBe(402);
            if (upgradeResponse.status !== 200) {
                throw new Error(
                    `upgrade returned ${upgradeResponse.status} ${JSON.stringify(upgradeResponse.body)}.`
                );
            }
            expect(upgradeResponse.status).toBe(200);
            expect(typeof upgradeResponse.body.zelfID).toBe("string");
            expect(upgradeResponse.body.zelfID).not.toBe(encryptResponse.body.zelfProof);

            const decryptResponse = await auth(request(API_BASE_URL).post(`${JWT_HUMAN_AUTHN}/decrypt`)).send(
                decryptBody(upgradeResponse.body.zelfID)
            );

            expect(decryptResponse.status).toBe(200);
            const payload = payloadFromDecrypt(decryptResponse.body);
            expect(payload.publicData).toMatchObject(PUBLIC_DATA);
            expect(payload.metadata).toMatchObject(METADATA);
        });
    });

    describe("POST /api/tags/decrypt upgrades a 3.1.6 lease", () => {
        const sampleFaceFromJSON = require("../../config/0012589021.json");
        jest.setTimeout(180000);

        it("re-pins v=4 and stamps a plan for non-hold names", async () => {
            const tagName = `decryptupg${Math.floor(Math.random() * 100000)
                .toString()
                .padStart(5, "0")}`;

            const leaseResponse = await auth(request(API_BASE_URL).post("/api/tags/lease")).send({
                tagName,
                domain: "zelf",
                faceBase64: sampleFaceFromJSON.faceBase64,
                password: "testpassword123",
                type: "create",
                os: "DESKTOP",
                removePGP: true,
            });

            expect(leaseResponse.status).toBe(200);
            const leased = leaseResponse.body.data;
            const leasedProof = leased?.zelfProof || leased?.tagObject?.zelfProof;
            if (!leasedProof) {
                throw new Error(`lease missing zelfProof: ${JSON.stringify(leaseResponse.body)}`);
            }
            expect(Number(leased.publicData?.v || leased.tagObject?.publicData?.v) === 4).toBe(false);

            await new Promise((resolve) => setTimeout(resolve, 3000));

            const decryptResponse = await auth(request(API_BASE_URL).post("/api/tags/decrypt")).send({
                tagName,
                domain: "zelf",
                faceBase64: sampleFaceFromJSON.faceBase64,
                password: "testpassword123",
                os: "DESKTOP",
                removePGP: true,
            });

            expect(decryptResponse.status).toBe(200);
            const publicData = decryptResponse.body.data.publicData;
            expect(Number(publicData.v)).toBe(4);
            const isHold =
                publicData.type === "hold" ||
                /\.hold(\.|$)/i.test(String(publicData.tagName || publicData.zelfName || ""));
            if (isHold) {
                expect(publicData.plan).toBeUndefined();
            } else {
                expect(["free", "premium", "unlimited"]).toContain(publicData.plan);
            }
            expect(decryptResponse.body.data.zelfProof).not.toBe(leasedProof);

            await auth(request(API_BASE_URL).delete("/api/tags/delete")).send({
                tagName,
                domain: "zelf",
                faceBase64: sampleFaceFromJSON.faceBase64,
                password: "testpassword123",
            });
        }, 180000);
    });
});
