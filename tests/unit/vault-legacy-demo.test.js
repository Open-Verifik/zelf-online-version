const LegacyDemo = require("../../Repositories/VaultLegacy/modules/vault-legacy-demo.module");

describe("vault-legacy-demo.module", () => {
    const originalEnv = { ...process.env };

    afterEach(() => {
        process.env = { ...originalEnv };
        jest.resetModules();
    });

    describe("normalizeVaultId", () => {
        it("pads short hex to bytes32", () => {
            expect(LegacyDemo.normalizeVaultId("0xabc")).toBe(`0x${"abc".padStart(64, "0")}`);
        });

        it("normalizes bigint vault ids", () => {
            expect(LegacyDemo.normalizeVaultId(255n)).toBe(`0x${"ff".padStart(64, "0")}`);
        });
    });

    describe("assertDemoLawyer", () => {
        it("throws 400 when lawyer does not match demo address", () => {
            process.env.LEGACY_DEMO_MODE = "true";
            process.env.LEGACY_DEMO_LAWYER_ADDRESS = "0xAbC00000000000000000000000000000000000001";
            jest.resetModules();
            const Demo = require("../../Repositories/VaultLegacy/modules/vault-legacy-demo.module");

            expect(() => Demo.assertDemoLawyer("0x0000000000000000000000000000000000000002")).toThrow(
                /Demo vaults must use lawyer address/
            );
            try {
                Demo.assertDemoLawyer("0x0000000000000000000000000000000000000002");
            } catch (e) {
                expect(e.status).toBe(400);
            }
        });

        it("throws 403 when demo mode is disabled", () => {
            process.env.LEGACY_DEMO_MODE = "false";
            jest.resetModules();
            const Demo = require("../../Repositories/VaultLegacy/modules/vault-legacy-demo.module");

            try {
                Demo.assertDemoLawyer("0x0000000000000000000000000000000000000001");
            } catch (e) {
                expect(e.status).toBe(403);
            }
        });
    });

    describe("resolveDemoHeartbeatInterval", () => {
        it("uses demo default when isDemo and no interval provided", () => {
            process.env.LEGACY_DEMO_HEARTBEAT_INTERVAL = "3600";
            jest.resetModules();
            const Demo = require("../../Repositories/VaultLegacy/modules/vault-legacy-demo.module");
            expect(Demo.resolveDemoHeartbeatInterval(true, undefined)).toBe(3600);
        });

        it("keeps explicit interval for demo vaults", () => {
            expect(LegacyDemo.resolveDemoHeartbeatInterval(true, 7200)).toBe(7200);
        });

        it("does not override production interval when not demo", () => {
            expect(LegacyDemo.resolveDemoHeartbeatInterval(false, undefined)).toBeUndefined();
            expect(LegacyDemo.resolveDemoHeartbeatInterval(false, 2592000)).toBe(2592000);
        });
    });

    describe("resolveBeneficiaryTagName", () => {
        it("strips .zelf suffix for single beneficiary with validator tag", () => {
            const entry = {
                beneficiaryEmails: ["a@b.com"],
                beneficiaryTagNames: ["alice.zelf", "aliceval.zelf"],
            };
            expect(LegacyDemo.resolveBeneficiaryTagName(entry, "0xabc", 0)).toBe("aliceval");
        });
    });

    describe("isDemoLawyerAddress", () => {
        it("returns true when address matches LEGACY_DEMO_LAWYER_ADDRESS", () => {
            process.env.LEGACY_DEMO_MODE = "true";
            process.env.LEGACY_DEMO_LAWYER_ADDRESS = "0xAbC00000000000000000000000000000000000001";
            jest.resetModules();
            const Demo = require("../../Repositories/VaultLegacy/modules/vault-legacy-demo.module");
            expect(Demo.isDemoLawyerAddress("0xabc00000000000000000000000000000000000001")).toBe(true);
        });

        it("returns false when demo mode is off", () => {
            process.env.LEGACY_DEMO_MODE = "false";
            jest.resetModules();
            const Demo = require("../../Repositories/VaultLegacy/modules/vault-legacy-demo.module");
            expect(Demo.isDemoLawyerAddress("0xabc00000000000000000000000000000000000000001")).toBe(false);
        });
    });

    describe("getDemoStatus", () => {
        it("returns enabled false when LEGACY_DEMO_MODE is off", async () => {
            process.env.LEGACY_DEMO_MODE = "false";
            jest.resetModules();
            const Demo = require("../../Repositories/VaultLegacy/modules/vault-legacy-demo.module");
            const status = await Demo.getDemoStatus();
            expect(status).toMatchObject({
                enabled: false,
                demoLawyerAddress: null,
                demoHeartbeatInterval: expect.any(Number),
                relayer: expect.any(Object),
            });
        });
    });
});
