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

	describe("GET /api/ton/address/:id/transactions", () => {
		it("returns paginated transactions", async () => {
			const response = await request(API_BASE_URL)
				.get(`/api/ton/address/${TEST_ADDRESS}/transactions`)
				.query({ page: "0", show: "10" })
				.set("Authorization", `Bearer ${authToken}`)
				.set("Origin", "https://test.example.com")
				.expect(200);

			expect(response.body).toHaveProperty("data");
			expect(response.body.data).toHaveProperty("pagination");
			expect(Array.isArray(response.body.data.transactions)).toBe(true);
		});
	});

	describe("GET /api/ton/address/:id/tokens", () => {
		it("returns jetton holdings", async () => {
			const response = await request(API_BASE_URL)
				.get(`/api/ton/address/${TEST_ADDRESS}/tokens`)
				.query({ page: "0", show: "10" })
				.set("Authorization", `Bearer ${authToken}`)
				.set("Origin", "https://test.example.com")
				.expect(200);

			expect(response.body).toHaveProperty("data");
			expect(Array.isArray(response.body.data)).toBe(true);
		});
	});

	describe("GET /api/ton/transaction/:id", () => {
		it("returns transaction detail for a real event id", async () => {
			const dashboard = await request(API_BASE_URL)
				.get(`/api/ton/address/${TEST_ADDRESS}`)
				.set("Authorization", `Bearer ${authToken}`)
				.set("Origin", "https://test.example.com")
				.expect(200);

			const eventId =
				dashboard.body.data?.transactions?.[0]?.hash ||
				dashboard.body.data?.transactions?.[0]?._source?.event_id;

			if (!eventId) {
				console.warn("Skipping transaction detail test: no transactions on test address");
				return;
			}

			const response = await request(API_BASE_URL)
				.get(`/api/ton/transaction/${eventId}`)
				.set("Authorization", `Bearer ${authToken}`)
				.set("Origin", "https://test.example.com")
				.expect(200);

			expect(response.body).toHaveProperty("data");
			expect(response.body.data).toHaveProperty("hash", eventId);
		});
	});

	describe("GET /api/ton/payment/service-wallet", () => {
		it("returns service wallet config or 503 when unset (no JWT)", async () => {
			const response = await request(API_BASE_URL).get("/api/ton/payment/service-wallet");
			expect([200, 503]).toContain(response.status);
		});
	});

	describe("POST /api/ton/payment/confirm", () => {
		it("rejects missing txHash with 409", async () => {
			const response = await request(API_BASE_URL)
				.post("/api/ton/payment/confirm")
				.set("Authorization", `Bearer ${authToken}`)
				.set("Origin", "https://test.example.com")
				.send({});

			expect(response.status).toBe(409);
			expect(response.body.validationError).toMatch(/txHash/i);
		});
	});

	describe("POST /api/ton/transfer/jetton", () => {
		it("rejects missing jetton fields with 409", async () => {
			const response = await request(API_BASE_URL)
				.post("/api/ton/transfer/jetton")
				.set("Authorization", `Bearer ${authToken}`)
				.set("Origin", "https://test.example.com")
				.send({ mnemonic: "abandon", toAddress: TEST_ADDRESS, amountTon: "1" });

			expect(response.status).toBe(409);
			expect(response.body.validationError).toBeDefined();
		});
	});
});
