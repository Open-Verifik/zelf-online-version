jest.mock("axios");
jest.mock("../../Repositories/TON/modules/ton-api.client");
jest.mock("../../Repositories/binance/modules/binance.module", () => ({
    getTickerPrice: jest.fn().mockResolvedValue({ price: "1.5" }),
}));
jest.mock("../../Repositories/Solana/modules/oklink", () => ({
    get_ApiKey: () => ({ getApiKey: () => "test-key" }),
}));

const axios = require("axios");
const { tonApiGet } = require("../../Repositories/TON/modules/ton-api.client");
const SuiModule = require("../../Repositories/sui/modules/sui-scrapping.module");
const TonModule = require("../../Repositories/TON/modules/ton-scrapping.module");

describe("chain tokens endpoint payload shape", () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });

    it("sui getTokens returns { balance, total, tokens } even when upstream is empty", async () => {
        axios.get.mockResolvedValue({ data: { data: { hits: [] } } });

        const result = await SuiModule.getTokens({ id: "0xabc" }, { page: "0", show: "10" });

        expect(result).toEqual({ balance: "0", total: 0, tokens: [] });
    });

    it("sui getTokens maps upstream hits into tokens array", async () => {
        axios.get.mockResolvedValue({
            data: {
                data: {
                    hits: [
                        {
                            usdValue: 2,
                            tokenType: "0x2::sui::SUI",
                            value: 1,
                            logoUrl: "https://example.com/sui.png",
                            coinName: "Sui",
                            price: 2,
                            symbol: "SUI",
                        },
                    ],
                },
            },
        });

        const result = await SuiModule.getTokens({ id: "0xabc" }, { page: "0", show: "10" });

        expect(Array.isArray(result.tokens)).toBe(true);
        expect(result.total).toBe(1);
        expect(result.tokens[0].symbol).toBe("SUI");
    });

    it("ton getTokens returns { balance, total, tokens }", async () => {
        tonApiGet.mockImplementation(async (path) => {
            if (path.includes("/jettons")) {
                return { balances: [] };
            }
            if (path.includes("/events")) {
                return { events: [] };
            }
            return { balance: 1000000000 };
        });

        const result = await TonModule.getTokens({ id: "EQBHyu-oZVDHRYQ1-rKlGqpHy5yAqanPBirEQNMNOmfHLotW" }, { page: "0", show: "10" });

        expect(Array.isArray(result.tokens)).toBe(true);
        expect(typeof result.total).toBe("number");
        expect(result.tokens.some((token) => token.symbol === "TON")).toBe(true);
    });
});
