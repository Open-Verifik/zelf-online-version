const request = require("supertest");
require("dotenv").config();

const API_BASE_URL = `http://localhost:${process.env.PORT || 3000}`;

const createSessionToken = async () => {
	const response = await request(API_BASE_URL)
		.post("/api/sessions")
		.set("Origin", "https://test.example.com")
		.send({
			identifier: `onboarding_${Date.now()}_${Math.random().toString(36).substring(7)}`,
			type: "createWallet",
		})
		.expect(200);

	return response.body.data.token;
};

describe("Human Authn onboarding progress API", () => {
	describe("GET /api/human-authn/onboarding-progress", () => {
		it("returns 401 without Authorization header", async () => {
			await request(API_BASE_URL)
				.get("/api/human-authn/onboarding-progress")
				.set("Origin", "https://test.example.com")
				.expect(401);
		});

		it("returns progress shape for authenticated requests", async () => {
			const token = await createSessionToken();

			const response = await request(API_BASE_URL)
				.get("/api/human-authn/onboarding-progress")
				.set("Origin", "https://test.example.com")
				.set("Authorization", `Bearer ${token}`)
				.expect(200);

			expect(response.body).toHaveProperty("data");
			expect(response.body.data).toHaveProperty("playCreate");
			expect(response.body.data).toHaveProperty("playPreview");
			expect(response.body.data).toHaveProperty("playDecrypt");
			expect(response.body.data.playCreate.complete).toBe(false);
			expect(response.body.data.playPreview.complete).toBe(false);
			expect(response.body.data.playDecrypt.complete).toBe(false);
		});
	});
});
