const { getPresaleLicenseExtensionYears } = require("../../Repositories/PreSale/modules/presale-license.util");

describe("getPresaleLicenseExtensionYears", () => {
    it("returns 1 year for purchases under $201", () => {
        expect(getPresaleLicenseExtensionYears(20)).toBe(1);
        expect(getPresaleLicenseExtensionYears(199)).toBe(1);
        expect(getPresaleLicenseExtensionYears(200)).toBe(1);
    });

    it("returns 2 years for purchases from $201 to $999", () => {
        expect(getPresaleLicenseExtensionYears(201)).toBe(2);
        expect(getPresaleLicenseExtensionYears(500)).toBe(2);
        expect(getPresaleLicenseExtensionYears(999)).toBe(2);
    });

    it("returns 3 years for purchases of $1000 or more", () => {
        expect(getPresaleLicenseExtensionYears(1000)).toBe(3);
        expect(getPresaleLicenseExtensionYears(10000)).toBe(3);
    });
});
