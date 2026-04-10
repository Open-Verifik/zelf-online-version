// Mobile app version API — requires a live server (same PORT as other integration tests).
// Compare assertions assume defaults or .env matching Core/config.js (e.g. minimum 1.5.0, latest 2.0.0).
const request = require("supertest");
require("dotenv").config();

const API_BASE_URL = `http://localhost:${process.env.PORT || 3000}`;
const ORIGIN = "https://test.example.com";

describe("GET /api/app/version — integration", () => {
    it("should reject when platform is missing", async () => {
        const response = await request(API_BASE_URL).get("/api/app/version").set("Origin", ORIGIN);

        expect(response.status).toBe(409);
        expect(response.body).toHaveProperty("validationError");
    });

    it("should reject invalid platform", async () => {
        const response = await request(API_BASE_URL).get("/api/app/version").query({ platform: "windows" }).set("Origin", ORIGIN);

        expect(response.status).toBe(409);
        expect(response.body).toHaveProperty("validationError");
    });

    it("should return policy for ios without current (no update flags)", async () => {
        const response = await request(API_BASE_URL).get("/api/app/version").query({ platform: "ios" }).set("Origin", ORIGIN);

        expect(response.status).toBe(200);
        expect(response.body.data).toMatchObject({
            platform: "ios",
        });
        expect(response.body.data).toHaveProperty("latestVersion");
        expect(response.body.data).toHaveProperty("minimumVersion");
        expect(response.body.data).toHaveProperty("storeUrl");
        expect(response.body.data).not.toHaveProperty("updateAvailable");
        expect(response.body.data).not.toHaveProperty("forceUpdate");
    });

    it("should return policy for android without current", async () => {
        const response = await request(API_BASE_URL).get("/api/app/version").query({ platform: "android" }).set("Origin", ORIGIN);

        expect(response.status).toBe(200);
        expect(response.body.data.platform).toBe("android");
        expect(response.body.data).not.toHaveProperty("updateAvailable");
    });

    it("should reject invalid current version", async () => {
        const response = await request(API_BASE_URL)
            .get("/api/app/version")
            .query({ platform: "ios", current: "not-a-version" })
            .set("Origin", ORIGIN);

        expect(response.status).toBe(422);
        expect(response.body).toHaveProperty("code");
    });

    it("should set forceUpdate when current is below minimum (defaults 1.5.0)", async () => {
        const response = await request(API_BASE_URL)
            .get("/api/app/version")
            .query({ platform: "ios", current: "1.4.0" })
            .set("Origin", ORIGIN);

        expect(response.status).toBe(200);
        expect(response.body.data).toMatchObject({
            currentClientVersion: "1.4.0",
            updateAvailable: true,
            forceUpdate: true,
        });
    });

    it("should set updateAvailable but not force when between minimum and latest", async () => {
        const response = await request(API_BASE_URL)
            .get("/api/app/version")
            .query({ platform: "android", current: "1.6.0" })
            .set("Origin", ORIGIN);

        expect(response.status).toBe(200);
        expect(response.body.data).toMatchObject({
            currentClientVersion: "1.6.0",
            updateAvailable: true,
            forceUpdate: false,
        });
    });

    it("should not require update at or above latest", async () => {
        const response = await request(API_BASE_URL)
            .get("/api/app/version")
            .query({ platform: "ios", current: "2.0.0" })
            .set("Origin", ORIGIN);

        expect(response.status).toBe(200);
        expect(response.body.data).toMatchObject({
            currentClientVersion: "2.0.0",
            updateAvailable: false,
            forceUpdate: false,
        });
    });

    it("should treat empty current like omitted (no update flags)", async () => {
        const response = await request(API_BASE_URL)
            .get("/api/app/version")
            .query({ platform: "ios", current: "" })
            .set("Origin", ORIGIN);

        expect(response.status).toBe(200);
        expect(response.body.data).not.toHaveProperty("updateAvailable");
    });
});
