// Mobile app version API — requires a live server (same PORT as other integration tests).
// Policy is loaded from MongoDB (singleton `MobileAppVersionPolicy`, key "default"); first request may upsert defaults (iOS 2.16.1, Android 3.16.1 for min+latest).
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
        expect(response.body.data).toMatchObject({
            latestVersion: "2.16.1",
            minimumVersion: "2.16.1",
        });
        expect(response.body.data).toHaveProperty("storeUrl");
        expect(response.body.data).not.toHaveProperty("updateAvailable");
        expect(response.body.data).not.toHaveProperty("forceUpdate");
    });

    it("should return policy for android without current", async () => {
        const response = await request(API_BASE_URL).get("/api/app/version").query({ platform: "android" }).set("Origin", ORIGIN);

        expect(response.status).toBe(200);
        expect(response.body.data).toMatchObject({
            platform: "android",
            latestVersion: "3.16.1",
            minimumVersion: "3.16.1",
        });
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

    it("should set forceUpdate when current is below minimum (iOS default 2.16.1)", async () => {
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

    it("should set both updateAvailable and forceUpdate when min equals latest and client is older", async () => {
        const response = await request(API_BASE_URL)
            .get("/api/app/version")
            .query({ platform: "android", current: "3.10.0" })
            .set("Origin", ORIGIN);

        expect(response.status).toBe(200);
        expect(response.body.data).toMatchObject({
            currentClientVersion: "3.10.0",
            updateAvailable: true,
            forceUpdate: true,
        });
    });

    it("should not require update at or above latest (iOS)", async () => {
        const response = await request(API_BASE_URL)
            .get("/api/app/version")
            .query({ platform: "ios", current: "2.16.1" })
            .set("Origin", ORIGIN);

        expect(response.status).toBe(200);
        expect(response.body.data).toMatchObject({
            currentClientVersion: "2.16.1",
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
