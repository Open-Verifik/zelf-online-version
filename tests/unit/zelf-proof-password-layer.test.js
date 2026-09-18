const {
    passwordLayerRequiresPassword,
    hasPasswordFromPasswordLayer,
    shouldBackfillHasPassword,
    applyPreviewHasPassword,
} = require("../../Repositories/ZelfProof/modules/zelf-proof.module");

describe("zelf-proof password layer helpers", () => {
    test("treats WithPassword and legacy Password as required", () => {
        expect(passwordLayerRequiresPassword("WithPassword")).toBe(true);
        expect(passwordLayerRequiresPassword("Password")).toBe(true);
        expect(hasPasswordFromPasswordLayer("WithPassword")).toBe("true");
        expect(hasPasswordFromPasswordLayer("Password")).toBe("true");
    });

    test("treats WithoutPassword and NoPassword as passwordless", () => {
        expect(passwordLayerRequiresPassword("WithoutPassword")).toBe(false);
        expect(passwordLayerRequiresPassword("NoPassword")).toBe(false);
        expect(hasPasswordFromPasswordLayer("WithoutPassword")).toBe("false");
    });

    test("backfills missing hasPassword and stale false on v3 proofs", () => {
        expect(shouldBackfillHasPassword({}, 3)).toBe(true);
        expect(shouldBackfillHasPassword({ hasPassword: "false" }, 3)).toBe(true);
        expect(shouldBackfillHasPassword({ hasPassword: "false" }, 4)).toBe(false);
        expect(shouldBackfillHasPassword({ hasPassword: "true" }, 3)).toBe(false);
    });

    test("stamps hasPassword and st from preview", () => {
        const tagObject = { publicData: {} };

        applyPreviewHasPassword(tagObject, { passwordLayer: "Password", publicData: { st: "pin" } });

        expect(tagObject.publicData.hasPassword).toBe("true");
        expect(tagObject.publicData.st).toBe("pin");
    });
});
