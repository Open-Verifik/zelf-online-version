// Stellar API Integration Tests - Testing Real Running Server
// Requires: server running (npm start), PORT in .env (e.g. 3050)
const request = require("supertest");
require("dotenv").config({ path: require("path").resolve(__dirname, "../../.env") });

const API_BASE_URL = `http://localhost:${process.env.PORT || 3050}`;
const TEST_ADDRESS = "GDIIMZDAGJKV7CIQDKEV4ICMDCDY5PDZPBPTH3UYUFFELVGPUAWUFD7W";

describe("Stellar API Integration Tests - Real Server", () => {
	let authToken;

	beforeAll(async () => {
		const sessionData = {
			identifier: `stellar_test_${Date.now()}_${Math.random().toString(36).substring(7)}`,
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

	describe("GET /api/stellar/address/:id", () => {
		it("should return address data with balance and transactions", async () => {
			const response = await request(API_BASE_URL)
				.get(`/api/stellar/address/${TEST_ADDRESS}`)
				.set("Authorization", `Bearer ${authToken}`)
				.set("Origin", "https://test.example.com")
				.expect(200);

			expect(response.body).toHaveProperty("data");
			const data = response.body.data;

			expect(data).toHaveProperty("address");
			expect(data).toHaveProperty("balance");
			expect(data).toHaveProperty("fiatBalance");
			expect(data).toHaveProperty("type");
			expect(data).toHaveProperty("account");
			expect(data.account).toHaveProperty("asset", "XLM");
			expect(data.account).toHaveProperty("fiatValue");
			expect(data.account).toHaveProperty("price");
			expect(data).toHaveProperty("tokenHoldings");
			expect(data.tokenHoldings).toHaveProperty("tokens");
			expect(Array.isArray(data.tokenHoldings.tokens)).toBe(true);
			expect(data).toHaveProperty("transactions");
			expect(Array.isArray(data.transactions)).toBe(true);
			expect(data).toHaveProperty("transactionsNext");

			if (data.transactions.length > 0) {
				const tx = data.transactions[0];
				expect(tx).toHaveProperty("hash");
				expect(tx).toHaveProperty("from");
				expect(tx).toHaveProperty("asset");
				expect(tx).toHaveProperty("date");
				expect(tx).toHaveProperty("traffic");
				expect(tx).toHaveProperty("status");
			}
		});
	});

	describe("GET /api/stellar/address/:id/transactions", () => {
		it("should return paginated transactions", async () => {
			const response = await request(API_BASE_URL)
				.get(`/api/stellar/address/${TEST_ADDRESS}/transactions`)
				.query({ limit: 5 })
				.set("Authorization", `Bearer ${authToken}`)
				.set("Origin", "https://test.example.com")
				.expect(200);

			expect(response.body).toHaveProperty("data");
			const data = response.body.data;

			expect(data).toHaveProperty("transactions");
			expect(Array.isArray(data.transactions)).toBe(true);
			expect(data).toHaveProperty("next");
			expect(typeof data.next).toBe("boolean");
		});
	});
});
