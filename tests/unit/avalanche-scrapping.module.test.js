const mockAxiosGet = jest.fn();
const mockInstanceGet = jest.fn();
const mockGetApiKey = jest.fn();

jest.mock("axios", () => {
	const mockAxios = jest.fn();
	mockAxios.get = mockAxiosGet;
	mockAxios.create = jest.fn(() => ({ get: mockInstanceGet }));
	return mockAxios;
});

jest.mock("../../Core/helpers", () => ({
	generateRandomUserAgent: () => "test-user-agent",
}));

jest.mock("../../Repositories/Solana/modules/oklink", () => ({
	get_ApiKey: () => ({ getApiKey: (...args) => mockGetApiKey(...args) }),
}));

jest.mock("../../Repositories/binance/modules/binance.module", () => ({
	getTickerPrice: jest.fn(),
}));

const { getTransactionsList } = require("../../Repositories/Avalanche/modules/avalanche-scrapping.module");
const {
	mapOkLinkTransaction,
	mapRouteScanTransaction,
	mapGlacierTransaction,
} = require("../../Repositories/Avalanche/modules/avalanche-transaction.util");

const TEST_ADDRESS = "0x742d35Cc6634C0532925a3b844Bc454e4438f44e";

describe("avalanche-transaction.util", () => {
	it("maps OKLink rows into the standard transaction shape", () => {
		const row = mapOkLinkTransaction(
			{
				hash: "0xabc",
				blockHeight: 123,
				blocktime: 1700000000,
				from: TEST_ADDRESS,
				to: "0xreceiver",
				value: 1.2345,
				method: "swapExact",
				realValue: -1.2345,
				fee: 0.0012,
			},
			TEST_ADDRESS
		);

		expect(row).toMatchObject({
			hash: "0xabc",
			block: "123",
			from: TEST_ADDRESS,
			to: "0xreceiver",
			amount: "1.2345",
			asset: "AVAX",
			method: "Swap",
			traffic: "OUT",
			txnFee: "0.0012",
			timestamp: 1700000000,
		});
	});

	it("maps RouteScan rows into the standard transaction shape", () => {
		const row = mapRouteScanTransaction(
			{
				id: "0xroutescan",
				blockNumber: 456,
				timestamp: "2024-01-01T00:00:00.000Z",
				from: "0xsender",
				to: TEST_ADDRESS,
				value: "1000000000000000000",
				gasUsed: "21000",
				gasPrice: "1000000000",
			},
			TEST_ADDRESS
		);

		expect(row).toMatchObject({
			hash: "0xroutescan",
			block: "456",
			from: "0xsender",
			to: TEST_ADDRESS,
			amount: "1.0000",
			asset: "AVAX",
			method: "Transfer",
			traffic: "IN",
			txnFee: "0.0000",
			timestamp: 1704067200,
		});
	});

	it("maps Glacier rows into the standard transaction shape", () => {
		const row = mapGlacierTransaction(
			{
				nativeTransaction: {
					txHash: "0xglacier",
					blockNumber: "789",
					blockTimestamp: 1700000100,
					from: { address: TEST_ADDRESS },
					to: { address: "0xreceiver" },
					value: "250000000000000000",
					gasUsed: "21000",
					gasPrice: "2000000000",
					method: { methodName: "transfer" },
				},
			},
			TEST_ADDRESS
		);

		expect(row).toMatchObject({
			hash: "0xglacier",
			block: "789",
			from: TEST_ADDRESS,
			to: "0xreceiver",
			amount: "0.2500",
			asset: "AVAX",
			method: "transfer",
			traffic: "OUT",
			txnFee: "0.0000",
			timestamp: 1700000100,
		});
	});
});

describe("getTransactionsList", () => {
	beforeEach(() => {
		mockAxiosGet.mockReset();
		mockInstanceGet.mockReset();
		mockGetApiKey.mockReset();
		mockGetApiKey.mockReturnValue("test-oklink-key");
	});

	it("returns OKLink transactions without calling fallbacks", async () => {
		mockAxiosGet.mockResolvedValueOnce({
			data: {
				code: "0",
				data: {
					hits: [
						{
							hash: "0xoklink",
							blockHeight: 100,
							blocktime: 1700000000,
							from: TEST_ADDRESS,
							to: "0xreceiver",
							value: 2,
							method: "transfer",
							realValue: -2,
							fee: 0.01,
						},
					],
				},
			},
		});

		const result = await getTransactionsList({ id: TEST_ADDRESS, page: "0", show: "10" });

		expect(result).toHaveLength(1);
		expect(result[0].hash).toBe("0xoklink");
		expect(mockAxiosGet).toHaveBeenCalledTimes(1);
		expect(mockInstanceGet).not.toHaveBeenCalled();
	});

	it("falls back to RouteScan when OKLink returns device-risk 403", async () => {
		mockAxiosGet.mockResolvedValueOnce({
			data: { code: 403, msg: "device risk check failed" },
		});
		mockInstanceGet.mockResolvedValueOnce({
			data: {
				items: [
					{
						id: "0xroutescan",
						blockNumber: 200,
						timestamp: "2024-02-01T12:00:00.000Z",
						from: "0xsender",
						to: TEST_ADDRESS,
						value: "500000000000000000",
						gasUsed: "21000",
						gasPrice: "1000000000",
					},
				],
			},
		});

		const result = await getTransactionsList({ id: TEST_ADDRESS, page: "0", show: "10" });

		expect(result).toHaveLength(1);
		expect(result[0].hash).toBe("0xroutescan");
		expect(mockAxiosGet).toHaveBeenCalledTimes(1);
		expect(mockInstanceGet).toHaveBeenCalledWith(
			`https://api.routescan.io/v2/network/mainnet/evm/43114/address/${TEST_ADDRESS}/transactions`,
			expect.objectContaining({ params: { limit: 10 } })
		);
	});

	it("falls back to Glacier when OKLink and RouteScan fail", async () => {
		mockAxiosGet.mockRejectedValueOnce({ response: { status: 403, data: { code: 403 } } });
		mockInstanceGet
			.mockRejectedValueOnce(new Error("routescan down"))
			.mockResolvedValueOnce({
				data: {
					transactions: [
						{
							nativeTransaction: {
								txHash: "0xglacier",
								blockNumber: "300",
								blockTimestamp: 1700000200,
								from: { address: "0xsender" },
								to: { address: TEST_ADDRESS },
								value: "1000000000000000000",
								gasUsed: "21000",
								gasPrice: "1000000000",
								method: { methodName: "Transfer" },
							},
						},
					],
				},
			});

		const result = await getTransactionsList({ id: TEST_ADDRESS, page: "0", show: "10" });

		expect(result).toHaveLength(1);
		expect(result[0].hash).toBe("0xglacier");
		expect(mockInstanceGet).toHaveBeenCalledTimes(2);
		expect(mockInstanceGet).toHaveBeenLastCalledWith(
			`https://glacier-api.avax.network/v1/chains/43114/addresses/${TEST_ADDRESS}/transactions`,
			expect.objectContaining({ params: { pageSize: 10 } })
		);
	});

	it("throws 502 when every upstream fails", async () => {
		mockAxiosGet.mockRejectedValueOnce(new Error("oklink down"));
		mockInstanceGet.mockRejectedValue(new Error("fallback down"));

		await expect(getTransactionsList({ id: TEST_ADDRESS, page: "0", show: "10" })).rejects.toMatchObject({
			message: "avalanche_transactions_unavailable",
			status: 502,
		});

		expect(mockAxiosGet).toHaveBeenCalledTimes(1);
		expect(mockInstanceGet).toHaveBeenCalledTimes(2);
	});
});
