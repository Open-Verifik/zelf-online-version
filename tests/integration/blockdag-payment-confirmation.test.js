// BlockDAG Payment Confirmation Integration Test
// Tests GET /api/blockdag/address/:address and validates the isBlockDAGPaymentConfirmed logic.
require("dotenv").config();
const request = require("supertest");

const API_BASE_URL = `http://localhost:${process.env.PORT || 3050}`;

// Address used in blockdag.module.js sample API responses - known to have transactions
const TEST_ADDRESS = "0x787389C8ec43D94362648310316F4348A4dE8C83";

let authToken;

const createSession = async () => {
	const res = await request(API_BASE_URL)
		.post("/api/sessions")
		.set("Origin", "https://test.example.com")
		.send({
			identifier: `bdag_test_${Date.now()}_${Math.random().toString(36).substring(7)}`,
			type: "createWallet",
			isWebExtension: false,
		});

	if (!res.body?.data?.token) throw new Error("Failed to create session: " + JSON.stringify(res.body));
	return res.body.data.token;
};

beforeAll(async () => {
	authToken = await createSession();
}, 15000);

describe("BlockDAG address endpoint", () => {
	it("should return balance and transactions for a known active address", async () => {
		const res = await request(API_BASE_URL)
			.get(`/api/blockdag/address/${TEST_ADDRESS}`)
			.set("Authorization", `Bearer ${authToken}`)
			.set("Origin", "https://test.example.com");

		expect(res.status).toBe(200);
		expect(res.body).toHaveProperty("data");

		const { data } = res.body;
		expect(data).toHaveProperty("balance");
		expect(data).toHaveProperty("address", TEST_ADDRESS);
		expect(data).toHaveProperty("transactions");
		expect(Array.isArray(data.transactions)).toBe(true);

		console.log(`  balance: ${data.balance} BDAG`);
		console.log(`  transactions: ${data.transactions.length}`);
	}, 30000);

	it("should return at least one transaction with required fields", async () => {
		const res = await request(API_BASE_URL)
			.get(`/api/blockdag/address/${TEST_ADDRESS}`)
			.set("Authorization", `Bearer ${authToken}`)
			.set("Origin", "https://test.example.com");

		expect(res.status).toBe(200);
		const { transactions } = res.body.data;

		expect(transactions.length).toBeGreaterThan(0);

		const tx = transactions[0];
		expect(tx).toHaveProperty("hash");
		expect(tx).toHaveProperty("traffic");
		expect(["IN", "OUT"]).toContain(tx.traffic);
		expect(tx).toHaveProperty("amount");
		expect(tx).toHaveProperty("from");
		expect(tx).toHaveProperty("to");

		console.log(`  first tx: hash=${tx.hash} traffic=${tx.traffic} amount=${tx.amount} BDAG`);
	}, 30000);

	it("BDAG native token should be included in tokenHoldings", async () => {
		const res = await request(API_BASE_URL)
			.get(`/api/blockdag/address/${TEST_ADDRESS}`)
			.set("Authorization", `Bearer ${authToken}`)
			.set("Origin", "https://test.example.com");

		expect(res.status).toBe(200);
		const { tokenHoldings } = res.body.data;
		expect(tokenHoldings).toHaveProperty("tokens");
		expect(Array.isArray(tokenHoldings.tokens)).toBe(true);

		const bdagToken = tokenHoldings.tokens.find((t) => t.symbol === "BDAG");
		expect(bdagToken).toBeDefined();
		expect(bdagToken.tokenType).toBe("BDAG");
		console.log(`  BDAG in tokenHoldings: ${bdagToken?.amount}`);
	}, 30000);
});

describe("isBlockDAGPaymentConfirmed logic - unit-style validation", () => {
	// Simulate the exact logic from my-tags.module.js
	const simulatePaymentCheck = (response, amountToPay) => {
		if (response?.error) return false;

		const numericBalance = Number(response?.balance ?? 0);

		if (!Number.isNaN(numericBalance) && numericBalance <= amountToPay) {
			return {
				confirmed: false,
				amountReceived: 0,
				amountToPay,
				checkedFactor: "balance",
			};
		}

		const amountReceived = (response?.transactions || [])
			.filter((tx) => tx.traffic === "IN")
			.reduce((sum, tx) => sum + Number(tx.amount), 0);

		return {
			confirmed: amountReceived >= amountToPay,
			amountReceived,
			amountToPay,
			checkedFactor: "transactions",
		};
	};

	it("returns false when response has error field", () => {
		const result = simulatePaymentCheck({ error: "Failed to fetch" }, 1.0);
		expect(result).toBe(false);
	});

	it("returns confirmed: false when balance is lower than amountToPay", () => {
		const result = simulatePaymentCheck({ balance: "0.001", transactions: [] }, 1.0);
		expect(result.confirmed).toBe(false);
		expect(result.checkedFactor).toBe("balance");
	});

	it("sums only IN transactions correctly", () => {
		const result = simulatePaymentCheck(
			{
				balance: "100",
				transactions: [
					{ traffic: "IN", amount: "20" },
					{ traffic: "IN", amount: "10" },
					{ traffic: "OUT", amount: "50" }, // should be ignored
				],
			},
			25
		);
		expect(result.checkedFactor).toBe("transactions");
		expect(result.amountReceived).toBeCloseTo(30);
		expect(result.confirmed).toBe(true);
	});

	it("returns confirmed: false when IN transactions are below amountToPay", () => {
		const result = simulatePaymentCheck(
			{
				balance: "100",
				transactions: [
					{ traffic: "IN", amount: "5" },
					{ traffic: "OUT", amount: "95" },
				],
			},
			10
		);
		expect(result.confirmed).toBe(false);
		expect(result.amountReceived).toBeCloseTo(5);
	});

	it("handles missing transactions array gracefully", () => {
		const result = simulatePaymentCheck({ balance: "100" }, 10);
		expect(result.checkedFactor).toBe("transactions");
		expect(result.amountReceived).toBe(0);
		expect(result.confirmed).toBe(false);
	});
});
