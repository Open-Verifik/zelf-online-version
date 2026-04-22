const mockGet = jest.fn();
const sharedAxios = { get: mockGet };

jest.mock("../../Core/axios", () => ({
	getCleanInstance: () => sharedAxios,
}));

describe("parseJupiterSearchItems", () => {
	it("maps Jupiter search items to mint -> { name, symbol, image }", () => {
		const { parseJupiterSearchItems } = require("../../Repositories/Solana/modules/jupiter-spl-metadata.module");
		const m = parseJupiterSearchItems([
			{ id: "So11111111111111111111111111111111111111112", name: "Wrapped SOL", symbol: "SOL", icon: "https://x/logo.png" },
			{ id: "incomplete" },
		]);
		expect(m.get("So11111111111111111111111111111111111111112")).toEqual({
			name: "Wrapped SOL",
			symbol: "SOL",
			image: "https://x/logo.png",
		});
		expect(m.has("incomplete")).toBe(false);
	});
});

describe("enrichSplTokenRowsWithJupiter", () => {
	beforeEach(() => {
		mockGet.mockReset();
		jest.resetModules();
		process.env.JUP_API_KEY = "test-jupiter-key";
		const { resetJupiterSplMetadataCacheForTests } = require("../../Repositories/Solana/modules/jupiter-spl-metadata.module");
		resetJupiterSplMetadataCacheForTests();
	});

	it("is a no-op when jupiterApiKey is missing (no HTTP)", async () => {
		jest.resetModules();
		jest.doMock("../../Core/config", () => ({ solana: { jupiterApiKey: undefined } }));
		const { enrichSplTokenRowsWithJupiter } = require("../../Repositories/Solana/modules/jupiter-spl-metadata.module");
		const rows = [{ tokenType: "SPL", symbol: "SPL", name: "SPL abcd…efgh", image: "", tokenAddress: "Mint11" }];
		await enrichSplTokenRowsWithJupiter(rows);
		expect(mockGet).not.toHaveBeenCalled();
		expect(rows[0].symbol).toBe("SPL");
		jest.unmock("../../Core/config");
	});

	it("fills name/symbol/image for placeholder SPL rows from Jupiter", async () => {
		const usdc = "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v";
		mockGet.mockResolvedValueOnce({
			data: [
				{
					id: usdc,
					name: "USD Coin",
					symbol: "USDC",
					icon: "https://example.com/usdc.png",
				},
			],
		});
		const { enrichSplTokenRowsWithJupiter } = require("../../Repositories/Solana/modules/jupiter-spl-metadata.module");
		const rows = [
			{ tokenType: "SPL", symbol: "SPL", name: "SPL EPjF…t1v", image: "", tokenAddress: usdc, owner: "o" },
		];
		await enrichSplTokenRowsWithJupiter(rows);
		expect(mockGet).toHaveBeenCalled();
		const [url, opts] = mockGet.mock.calls[0];
		expect(String(url)).toContain("/tokens/v2/search");
		expect(opts.params.query).toBe(usdc);
		const cfg = require("../../Core/config");
		expect(opts.headers["x-api-key"]).toBe(cfg.solana.jupiterApiKey);
		expect(rows[0]).toMatchObject({
			name: "USD Coin",
			symbol: "USDC",
			image: "https://example.com/usdc.png",
		});
	});

	it("uses cache on a second call for the same mint", async () => {
		const mint = "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v";
		mockGet.mockResolvedValue({
			data: [
				{
					id: mint,
					name: "USD Coin",
					symbol: "USDC",
					icon: "https://a.png",
				},
			],
		});
		const { enrichSplTokenRowsWithJupiter, resetJupiterSplMetadataCacheForTests } = require("../../Repositories/Solana/modules/jupiter-spl-metadata.module");
		const row = { tokenType: "SPL", symbol: "SPL", name: "x", image: "", tokenAddress: mint };
		await enrichSplTokenRowsWithJupiter([row]);
		const callsAfterFirst = mockGet.mock.calls.length;
		expect(row.symbol).toBe("USDC");
		await enrichSplTokenRowsWithJupiter([{ ...row, name: "SPL x", symbol: "SPL" }]);
		expect(mockGet.mock.calls.length).toBe(callsAfterFirst);
		resetJupiterSplMetadataCacheForTests();
	});
});
