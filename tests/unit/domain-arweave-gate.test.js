describe("Domain.isArweaveEnabled SKIP_ARWEAVE gate", () => {
    beforeEach(() => {
        jest.resetModules();
    });

    const loadDomain = (skipArweave) => {
        jest.doMock("../../Core/config", () => ({
            zelfProof: { skipArweave },
        }));
        const { Domain } = require("../../Repositories/Tags/modules/domain.class");
        return new Domain({
            name: "zelf",
            tags: {
                payment: { discounts: {}, whitelist: {}, pricingTable: {} },
                storage: { arweaveEnabled: true },
            },
        });
    };

    test("returns false when SKIP_ARWEAVE is set (local/dev IPFS-only)", () => {
        const domain = loadDomain("true");
        expect(domain.isArweaveEnabled()).toBe(false);
    });

    test("returns domain storage flag when SKIP_ARWEAVE is unset", () => {
        const domain = loadDomain(false);
        expect(domain.isArweaveEnabled()).toBe(true);
    });

    test("returns false when domain storage disables Arweave and SKIP_ARWEAVE is unset", () => {
        jest.doMock("../../Core/config", () => ({
            zelfProof: { skipArweave: false },
        }));
        const { Domain } = require("../../Repositories/Tags/modules/domain.class");
        const domain = new Domain({
            name: "zelf",
            tags: {
                payment: { discounts: {}, whitelist: {}, pricingTable: {} },
                storage: { arweaveEnabled: false },
            },
        });
        expect(domain.isArweaveEnabled()).toBe(false);
    });
});
