const mockEthplorerGet = jest.fn();
const mockIdAseet = jest.fn();
const mockRpcRequest = jest.fn();
const mockFetchTokenMetadata = jest.fn();

jest.mock("../../Core/axios", () => ({
    getCleanInstance: () => ({
        get: (...args) => mockEthplorerGet(...args),
    }),
}));

jest.mock("../../Repositories/dataAnalytics/modules/dataAnalytics.module", () => ({
    idAseet_: (...args) => mockIdAseet(...args),
}));

jest.mock("../../Repositories/Alchemy/modules/alchemy.module", () => ({
    rpcRequest: (...args) => mockRpcRequest(...args),
    fetchTokenMetadata: (...args) => mockFetchTokenMetadata(...args),
    parseHexBalance: (value) => {
        if (!value || value === "0x0") return 0n;
        return BigInt(value);
    },
    formatTokenBalance: (rawBalance, decimals = 18) => {
        const raw = BigInt(rawBalance || "0x0");
        const divisor = 10n ** BigInt(decimals);
        const whole = raw / divisor;
        const fraction = raw % divisor;
        if (fraction === 0n) return whole.toString();
        return `${whole}.${fraction.toString().padStart(Number(decimals), "0").replace(/0+$/, "")}`;
    },
}));

describe("ethereum-address-holdings.util", () => {
    beforeEach(() => {
        jest.clearAllMocks();
        process.env.ETHEREUM_ADDRESS_MAX_TOKENS = "3";
        process.env.ETHEREUM_ADDRESS_MIN_FIAT_USD = "1";
        process.env.ETHEREUM_ADDRESS_CMC_CONCURRENCY = "2";
        process.env.ETHEREUM_ADDRESS_METADATA_CONCURRENCY = "2";
        jest.resetModules();
    });

    it("caps and deduplicates Ethplorer token formatting with bounded CMC lookups", async () => {
        mockIdAseet.mockImplementation(async (symbol) => ({ idAseet: symbol === "AAA" ? 1 : 2 }));

        const { formatEthplorerTokensHardened } = require("../../Repositories/etherscan/modules/ethereum-address-holdings.util");

        const tokens = Array.from({ length: 5 }, (_, index) => ({
            tokenInfo: {
                address: `0x${index}`,
                decimals: 18,
                name: `Token ${index}`,
                price: { rate: 10 - index },
                symbol: index % 2 === 0 ? "AAA" : "BBB",
            },
            rawBalance: "1000000000000000000",
        }));

        const { tokens: formatted, totalTokenCount } = await formatEthplorerTokensHardened(tokens);

        expect(totalTokenCount).toBe(5);
        expect(formatted).toHaveLength(3);
        expect(formatted[0].symbol).toBe("AAA");
        expect(mockIdAseet).toHaveBeenCalledTimes(2);
    });

    it("uses Alchemy balances with Ethplorer pricing and caps metadata fanout", async () => {
        mockRpcRequest.mockImplementation(async (_network, method) => {
            if (method === "eth_getBalance") return "0xde0b6b3a7640000";
            if (method === "alchemy_getTokenBalances") {
                return {
                    tokenBalances: [
                        { contractAddress: "0xA", tokenBalance: "0xde0b6b3a7640000" },
                        { contractAddress: "0xB", tokenBalance: "0xde0b6b3a7640000" },
                        { contractAddress: "0xC", tokenBalance: "0xde0b6b3a7640000" },
                        { contractAddress: "0xD", tokenBalance: "0xde0b6b3a7640000" },
                    ],
                };
            }
            throw new Error(`unexpected rpc ${method}`);
        });

        mockEthplorerGet.mockResolvedValue({
            data: {
                ETH: { balance: 1 },
                tokens: [
                    { tokenInfo: { address: "0xA", decimals: 18, name: "Token A", price: { rate: 100 }, symbol: "TKA" }, rawBalance: "1000000000000000000" },
                    { tokenInfo: { address: "0xB", decimals: 18, name: "Token B", price: { rate: 50 }, symbol: "TKB" }, rawBalance: "1000000000000000000" },
                    { tokenInfo: { address: "0xC", decimals: 18, name: "Token C", price: { rate: 25 }, symbol: "TKC" }, rawBalance: "1000000000000000000" },
                    { tokenInfo: { address: "0xD", decimals: 18, name: "Token D", price: { rate: 10 }, symbol: "TKD" }, rawBalance: "1000000000000000000" },
                ],
            },
        });

        const { getEthereumPortfolioViaAlchemy } = require("../../Repositories/etherscan/modules/ethereum-address-holdings.util");
        const portfolio = await getEthereumPortfolioViaAlchemy("0xabc");

        expect(portfolio.nativeEthBalance).toBe(1);
        expect(portfolio.totalTokenCount).toBe(4);
        expect(portfolio.tokens).toHaveLength(3);
        expect(portfolio.tokens[0].symbol).toBe("TKA");
        expect(mockFetchTokenMetadata).not.toHaveBeenCalled();
        expect(mockIdAseet).not.toHaveBeenCalled();
    });
});
