const mockGet = jest.fn();
const mockGetNaasNodeUrl = jest.fn();
const mockRefreshNaasCatalogAfterUnauthorized = jest.fn();
const mockGetTickerPrice = jest.fn();

jest.mock("../../Core/axios", () => ({
	getCleanInstance: () => ({ get: mockGet }),
}));

jest.mock("../../Core/helpers", () => ({
	generateRandomUserAgent: () => "test-user-agent",
}));

jest.mock("../../Core/naas-gateway-catalog", () => ({
	getNaasNodeUrl: (...args) => mockGetNaasNodeUrl(...args),
	NAAS_CHAIN: { BITCOIN: "bitcoin" },
	refreshNaasCatalogAfterUnauthorized: (...args) => mockRefreshNaasCatalogAfterUnauthorized(...args),
	isNaasNodeUnauthorizedError: (err) => err?.response?.status === 401,
}));

jest.mock("../../Repositories/binance/modules/binance.module", () => ({
	getTickerPrice: (...args) => mockGetTickerPrice(...args),
}));

const {
	getTransactionsList,
	getBalance,
	mapEsploraTxToBlockbookShape,
	extractTransactionDataFromSourceA,
} = require("../../Repositories/bitcoin/modules/bitcoin-scrapping.module");

describe("bitcoin-scrapping.module", () => {
	beforeEach(() => {
		mockGet.mockReset();
		mockGetNaasNodeUrl.mockReset();
		mockRefreshNaasCatalogAfterUnauthorized.mockReset();
		mockGetTickerPrice.mockReset();
		delete process.env.BTC_BOOK_FALLBACK_URL;
		mockGetNaasNodeUrl.mockResolvedValue("https://btc-book.twnodes.com/naas/session/test-token");
		mockGetTickerPrice.mockResolvedValue({ price: 50000 });
	});

	describe("extractTransactionDataFromSourceA", () => {
		it("normalizes Blockbook tx shape", () => {
			const tx = extractTransactionDataFromSourceA({
				txid: "abc123",
				fees: 1000,
				blockHeight: 800000,
				confirmations: 2,
				vin: [{ addresses: ["bc1qsender"] }],
				vout: [{ addresses: ["bc1qreceiver"], value: 100000 }],
			});

			expect(tx).toMatchObject({
				hash: "abc123",
				from: "bc1qsender",
				to: ["bc1qreceiver"],
				status: "confirmed",
				symbol: "BTC",
			});
		});
	});

	describe("mapEsploraTxToBlockbookShape", () => {
		it("maps Esplora tx fields for shared normalization", () => {
			const mapped = mapEsploraTxToBlockbookShape({
				txid: "abc123",
				fee: 500,
				status: { confirmed: true, block_height: 800001 },
				vin: [{ prevout: { scriptpubkey_address: "bc1qsender" } }],
				vout: [{ scriptpubkey_address: "bc1qreceiver", value: 200000 }],
			});

			expect(mapped.txid).toBe("abc123");
			expect(mapped.vin[0].addresses).toEqual(["bc1qsender"]);
			expect(mapped.vout[0].addresses).toEqual(["bc1qreceiver"]);
		});
	});

	describe("getTransactionsList", () => {
		it("returns Blockbook transactions when NaaS is healthy", async () => {
			mockGet
				.mockResolvedValueOnce({ data: { txids: ["tx1"] } })
				.mockResolvedValueOnce({
					data: {
						txid: "tx1",
						fees: 1000,
						blockHeight: 800000,
						confirmations: 1,
						vin: [{ addresses: ["bc1qsender"] }],
						vout: [{ addresses: ["bc1qreceiver"], value: 100000 }],
					},
				});

			const result = await getTransactionsList({ id: "bc1qreceiver" }, { show: "10" });

			expect(result.transactions).toHaveLength(1);
			expect(result.transactions[0].hash).toBe("tx1");
			expect(mockGet).toHaveBeenCalledWith(
				expect.stringContaining("/api/v2/address/bc1qreceiver"),
				expect.any(Object)
			);
		});

		it("falls back to mempool.space when Blockbook fails", async () => {
			mockGet
				.mockRejectedValueOnce(new Error("blockbook down"))
				.mockResolvedValueOnce({
					data: [
						{
							txid: "tx-esplora",
							fee: 500,
							status: { confirmed: true, block_height: 800001 },
							vin: [{ prevout: { scriptpubkey_address: "bc1qsender" } }],
							vout: [{ scriptpubkey_address: "bc1qreceiver", value: 200000 }],
						},
					],
				});

			const result = await getTransactionsList({ id: "bc1qreceiver" }, { show: "10" });

			expect(result.transactions).toHaveLength(1);
			expect(result.transactions[0].hash).toBe("tx-esplora");
			expect(mockGet).toHaveBeenCalledWith("https://mempool.space/api/address/bc1qreceiver/txs");
		});

		it("throws 502 when every upstream fails", async () => {
			mockGet.mockRejectedValue(new Error("upstream down"));

			await expect(getTransactionsList({ id: "bc1qreceiver" }, { show: "10" })).rejects.toMatchObject({
				message: "bitcoin_transactions_unavailable",
				status: 502,
			});
		});
	});

	describe("getBalance", () => {
		it("falls back to Esplora when Blockbook balance fails", async () => {
			mockGet
				.mockRejectedValueOnce(new Error("blockbook down"))
				.mockResolvedValueOnce({
					data: {
						chain_stats: { funded_txo_sum: 300000, spent_txo_sum: 100000 },
					},
				})
				.mockResolvedValueOnce({
					data: [
						{
							txid: "tx-esplora",
							fee: 500,
							status: { confirmed: true, block_height: 800001 },
							vin: [{ prevout: { scriptpubkey_address: "bc1qsender" } }],
							vout: [{ scriptpubkey_address: "bc1qreceiver", value: 200000 }],
						},
					],
				});

			const result = await getBalance({ id: "bc1qreceiver" });

			expect(result.balance).toBe("0.002");
			expect(result.transactions).toHaveLength(1);
		});

		it("throws 502 when every balance upstream fails", async () => {
			mockGet.mockRejectedValue(new Error("upstream down"));

			await expect(getBalance({ id: "bc1qreceiver" })).rejects.toMatchObject({
				message: "bitcoin_balance_unavailable",
				status: 502,
			});
		});
	});
});
