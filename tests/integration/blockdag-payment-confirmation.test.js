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
	const {
		filterSessionInboundTransactions,
		parseTagPayAmount,
	} = require("../../Repositories/Tags/modules/tag-pay-session-tx.util");

	const SESSION_T0 = 1_700_000_000;
	const txIn = (amount, ts = SESSION_T0) => ({ traffic: "IN", amount: String(amount), timestamp: ts });
	const txOut = (amount, ts = SESSION_T0) => ({ traffic: "OUT", amount: String(amount), timestamp: ts });

	const simulatePaymentCheck = (response, amountToPay, initiatedAtUnix = SESSION_T0) => {
		const amountNum = parseTagPayAmount(amountToPay);
		if (amountNum == null) {
			return { confirmed: false, amountReceived: 0, amountToPay, checkedFactor: "invalid_amount" };
		}
		if (response?.error) return false;

		const numericBalance = Number(response?.balance ?? 0);

		if (!Number.isNaN(numericBalance) && numericBalance <= amountNum) {
			return {
				confirmed: false,
				amountReceived: 0,
				amountToPay: amountNum,
				checkedFactor: "balance",
			};
		}

		const sessionTxs = filterSessionInboundTransactions(response?.transactions, initiatedAtUnix);
		const amountReceived = sessionTxs.reduce((sum, tx) => sum + Number(tx.amount), 0);

		return {
			confirmed: amountReceived >= amountNum,
			amountReceived,
			amountToPay: amountNum,
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

	it("sums only IN transactions correctly (session-scoped)", () => {
		const result = simulatePaymentCheck(
			{
				balance: "100",
				transactions: [txIn(20), txIn(10), txOut(50)],
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
				transactions: [txIn(5), txOut(95)],
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

	it("ignores IN transactions before payment session start (busy treasury)", () => {
		const result = simulatePaymentCheck(
			{
				balance: "100",
				transactions: [txIn(100, SESSION_T0 - 86_400), txIn(5, SESSION_T0 + 120)],
			},
			10,
			SESSION_T0
		);
		expect(result.amountReceived).toBeCloseTo(5);
		expect(result.confirmed).toBe(false);
	});
});
