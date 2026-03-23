const { usdcAtomicFromUsd } = require("../../Repositories/Tags/modules/tag-pay-usdc.util");

describe("usdcAtomicFromUsd", () => {
    it("maps whole USD to 6-decimal USDC units", () => {
        expect(usdcAtomicFromUsd(24)).toBe(24_000_000n);
        expect(usdcAtomicFromUsd("24")).toBe(24_000_000n);
    });

    it("floors fractional USD to micro-dollars", () => {
        expect(usdcAtomicFromUsd("24.123456")).toBe(24_123_456n);
        expect(usdcAtomicFromUsd("0.99")).toBe(990_000n);
    });
});
