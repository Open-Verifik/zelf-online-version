// TON API Integration Tests - requires live server (npm start) and PORT in .env
const request = require("supertest");
require("dotenv").config({ path: require("path").resolve(__dirname, "../../.env") });

const API_BASE_URL = `http://localhost:${process.env.PORT || 3050}`;
const TEST_ADDRESS = "EQBHyu-oZVDHRYQ1-rKlGqpHy5yAqanPBirEQNMNOmfHLotW";

describe("TON API Integration Tests - Real Server", () => {
	let authToken;

	beforeAll(async () => {
		const sessionData = {
			identifier: `ton_test_${Date.now()}_${Math.random().toString(36).substring(7)}`,
			type: "general",
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

	describe("GET /api/ton/address/:id", () => {
		it("should return address dashboard with token holdings", async () => {
			const response = await request(API_BASE_URL)
				.get(`/api/ton/address/${TEST_ADDRESS}`)
				.set("Authorization", `Bearer ${authToken}`)
				.set("Origin", "https://test.example.com")
				.expect(200);

			expect(response.body).toHaveProperty("data");
			const data = response.body.data;
			expect(data).toHaveProperty("address");
			expect(data).toHaveProperty("balance");
			expect(data).toHaveProperty("tokenHoldings");
			expect(Array.isArray(data.tokenHoldings.tokens)).toBe(true);
			expect(data).toHaveProperty("transactions");
			expect(Array.isArray(data.transactions)).toBe(true);
			expect(data.account).toHaveProperty("price");
			expect(Number(data.account.price)).toBeGreaterThan(0);
			expect(typeof data.fiatBalance).toBe("number");
			const nativeTon = data.tokenHoldings.tokens.find((t) => t.symbol === "TON");
			expect(nativeTon).toBeDefined();
			expect(Number(nativeTon.price)).toBeGreaterThan(0);
		});
	});

	describe("GET /api/ton/payment/service-wallet", () => {
		it("returns service wallet config or 503 when unset", async () => {
			const response = await request(API_BASE_URL).get("/api/ton/payment/service-wallet");
			expect([200, 503]).toContain(response.status);
		});
	});
});
