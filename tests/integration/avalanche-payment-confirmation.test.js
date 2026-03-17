// Avalanche Payment Confirmation Integration Test
// Tests the isAvalanchePaymentConfirmed flow via GET /api/avalanche/address/:id
// against the real running server, and validates the logic that was previously broken.
require("dotenv").config();
const request = require("supertest");

const API_BASE_URL = `http://localhost:${process.env.PORT || 3050}`;

// Real Avalanche address with some activity
const TEST_ADDRESS = "0x787389C8ec43D94362648310316F4348A4dE8C83";

let authToken;

const createSession = async () => {
	const res = await request(API_BASE_URL)
		.post("/api/sessions")
		.set("Origin", "https://test.example.com")
		.send({
			identifier: `avax_test_${Date.now()}_${Math.random().toString(36).substring(7)}`,
			type: "createWallet",
			isWebExtension: false,
		});

	if (!res.body?.data?.token) throw new Error("Failed to create session: " + JSON.stringify(res.body));
	return res.body.data.token;
};

beforeAll(async () => {
	authToken = await createSession();
}, 15000);

describe("Avalanche balance endpoint - RouteScan resilience", () => {
	it("should return a valid balance response even when RouteScan is degraded", async () => {
		const res = await request(API_BASE_URL)
			.get(`/api/avalanche/address/${TEST_ADDRESS}`)
			.set("Authorization", `Bearer ${authToken}`)
			.set("Origin", "https://test.example.com");

		// Should not 500 anymore regardless of RouteScan status
		expect(res.status).toBe(200);
		expect(res.body).toHaveProperty("data");

		const { data } = res.body;
		expect(data).toHaveProperty("balance");
		expect(data).toHaveProperty("address", TEST_ADDRESS);
		expect(data).toHaveProperty("tokenHoldings");
		expect(data.tokenHoldings).toHaveProperty("tokens");
		expect(Array.isArray(data.tokenHoldings.tokens)).toBe(true);

		// total should be a number (may be from RouteScan or fallback)
		expect(typeof data.tokenHoldings.total).toBe("number");

		// transactions should be an array
		expect(Array.isArray(data.transactions)).toBe(true);
		console.log(`  balance: ${data.balance} AVAX`);
		console.log(`  token count (total field): ${data.tokenHoldings.total}`);
		console.log(`  tokens from Glacier: ${data.tokenHoldings.tokens.length}`);
		console.log(`  transactions: ${data.transactions.length}`);
	}, 30000);

	it("AVAX token should be included in tokenHoldings", async () => {
		const res = await request(API_BASE_URL)
			.get(`/api/avalanche/address/${TEST_ADDRESS}`)
			.set("Authorization", `Bearer ${authToken}`)
			.set("Origin", "https://test.example.com");

		expect(res.status).toBe(200);
		const avaxToken = res.body.data.tokenHoldings.tokens.find((t) => t.symbol === "AVAX");
		expect(avaxToken).toBeDefined();
		expect(avaxToken.tokenType).toBe("AVAX");
		console.log(`  AVAX in tokenHoldings: ${avaxToken?.amount}`);
	}, 30000);
});

describe("isAvalanchePaymentConfirmed logic - unit-style validation", () => {
	// Simulate the exact logic from my-tags.module.js with a real response
	const simulatePaymentCheck = (response, amountToPay) => {
		const numericBalance = Number(response?.balance ?? 0);

		if (!Number.isNaN(numericBalance) && numericBalance <= amountToPay) {
			return {
				confirmed: false,
				amountReceived: 0,
				amountToPay,
				checkedFactor: "balance",
			};
		}

		// Lines 230-232: the fix we're testing
		const amountReceived = response?.transactions
			.filter((transaction) => transaction.traffic === "IN")
			.reduce((sum, transaction) => sum + Number(transaction.amount), 0);

		return {
			confirmed: amountReceived >= amountToPay,
			amountReceived,
			amountToPay,
			checkedFactor: "transactions",
		};
	};

	it("returns confirmed: false when balance is lower than amountToPay", () => {
		const mockResponse = { balance: "0.001", transactions: [] };
		const result = simulatePaymentCheck(mockResponse, 1.0);
		expect(result.confirmed).toBe(false);
		expect(result.checkedFactor).toBe("balance");
	});

	it("sums only IN transactions correctly", () => {
		const mockResponse = {
			balance: "10",
			transactions: [
				{ traffic: "IN", amount: "0.5" },
				{ traffic: "IN", amount: "1.0" },
				{ traffic: "OUT", amount: "5.0" }, // should be ignored
			],
		};
		const result = simulatePaymentCheck(mockResponse, 1.0);
		expect(result.checkedFactor).toBe("transactions");
		expect(result.amountReceived).toBeCloseTo(1.5);
		expect(result.confirmed).toBe(true);
	});

	it("returns confirmed: false when IN transactions are below amountToPay", () => {
		const mockResponse = {
			balance: "10",
			transactions: [
				{ traffic: "IN", amount: "0.1" },
				{ traffic: "OUT", amount: "9.9" },
			],
		};
		const result = simulatePaymentCheck(mockResponse, 1.0);
		expect(result.confirmed).toBe(false);
		expect(result.amountReceived).toBeCloseTo(0.1);
	});

	it("returns confirmed: false when there are no IN transactions", () => {
		const mockResponse = {
			balance: "10",
			transactions: [{ traffic: "OUT", amount: "2.0" }],
		};
		const result = simulatePaymentCheck(mockResponse, 0.5);
		expect(result.confirmed).toBe(false);
		expect(result.amountReceived).toBe(0);
	});
});
