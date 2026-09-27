const mockGet = jest.fn();

jest.mock("../../Core/axios", () => ({
	getCleanInstance: () => ({ get: mockGet }),
}));

jest.mock("../../Core/helpers", () => ({
	generateRandomUserAgent: () => "test-user-agent",
}));

const { getTransactionsList, normalizeTransactionsPayload } = require("../../Repositories/XRP/modules/xrp-scrapping.module");

describe("normalizeTransactionsPayload", () => {
	it("returns the array when xrpscan responds with a bare list", () => {
		const txs = [{ hash: "abc" }];
		expect(normalizeTransactionsPayload(txs)).toEqual(txs);
	});

	it("unwraps xrpscan account transaction envelopes", () => {
		const txs = [{ hash: "abc" }, { hash: "def" }];
		expect(normalizeTransactionsPayload({ account: "rTest", transactions: txs })).toEqual(txs);
	});

	it("returns an empty array for unexpected shapes", () => {
		expect(normalizeTransactionsPayload(null)).toEqual([]);
		expect(normalizeTransactionsPayload({})).toEqual([]);
		expect(normalizeTransactionsPayload({ transactions: "bad" })).toEqual([]);
	});
});

describe("getTransactionsList", () => {
	beforeEach(() => {
		mockGet.mockReset();
	});

	it("returns normalized transactions and marker on success", async () => {
		mockGet.mockResolvedValue({
			data: {
				account: "rN7n7otQDd6FczFgLdSqtcsAUxDkw6fzRH",
				transactions: [{ hash: "tx1" }],
				marker: "next-page",
			},
		});

		const result = await getTransactionsList({ id: "rN7n7otQDd6FczFgLdSqtcsAUxDkw6fzRH" }, { page: "0", show: "10" });

		expect(result).toEqual({
			transactions: [{ hash: "tx1" }],
			marker: "next-page",
		});
		expect(mockGet).toHaveBeenCalledWith(
			expect.stringContaining("/account/rN7n7otQDd6FczFgLdSqtcsAUxDkw6fzRH/transactions?"),
			expect.objectContaining({
				headers: expect.objectContaining({
					Accept: "application/json",
					"User-Agent": "test-user-agent",
				}),
			})
		);
	});

	it("returns an empty list when xrpscan responds 404", async () => {
		mockGet.mockRejectedValue({ response: { status: 404 }, message: "Request failed with status code 404" });

		const result = await getTransactionsList({ id: "rMissing" }, { page: "0", show: "10" });

		expect(result).toEqual({ transactions: [] });
	});

	it("retries retryable upstream failures and returns an empty list after exhaustion", async () => {
		const upstreamError = { response: { status: 503 }, message: "Request failed with status code 503" };
		mockGet.mockRejectedValue(upstreamError);

		const result = await getTransactionsList({ id: "rN7n7otQDd6FczFgLdSqtcsAUxDkw6fzRH" }, { page: "0", show: "10" });

		expect(result).toEqual({ transactions: [] });
		expect(mockGet).toHaveBeenCalledTimes(3);
	});

	it("throws 400 when address is missing", async () => {
		await expect(getTransactionsList({ id: "" }, { page: "0", show: "10" })).rejects.toMatchObject({
			message: "missing_address",
			status: 400,
		});
	});
});
