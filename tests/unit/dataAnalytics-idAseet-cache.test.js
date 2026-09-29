const mockFindOne = jest.fn();

jest.mock("../../Repositories/dataAnalytics/models/dataAnalytics.model", () => ({
    findOne: (...args) => mockFindOne(...args),
    findOneAndUpdate: jest.fn(),
}));

jest.mock("../../Core/axios", () => ({
    getCleanInstance: () => ({
        get: jest.fn().mockResolvedValue({ data: { fields: ["symbol", "name", "id"], values: [] } }),
    }),
}));

describe("idAseet_ caching", () => {
    beforeEach(() => {
        jest.clearAllMocks();
        jest.resetModules();
    });

    it("deduplicates concurrent lookups for the same symbol", async () => {
        mockFindOne.mockImplementation(
            () =>
                new Promise((resolve) => {
                    setTimeout(() => resolve({ crypto: [{ symbol: "ETH", name: "Ethereum", id: 1027 }] }), 20);
                })
        );

        const { idAseet_ } = require("../../Repositories/dataAnalytics/modules/dataAnalytics.module");

        const [first, second] = await Promise.all([idAseet_("ETH"), idAseet_("ETH")]);

        expect(first.idAseet).toBe(1027);
        expect(second.idAseet).toBe(1027);
        expect(mockFindOne).toHaveBeenCalledTimes(1);
    });
});
