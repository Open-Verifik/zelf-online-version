const { APTOS_DERIVATION_PATH, createAptosWallet } = require("../../Repositories/Wallet/modules/aptos");

const KNOWN_MNEMONIC = "abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon about";
const EXPECTED_ADDRESS = "0xeb663b681209e7087d681c5d3eed12aaa8e1915e7c87794542c3f96e94b3d3bf";
const EXPECTED_PUBLIC_KEY = "0xa686f0309ab80312979606cfccc10ea2740147ae6888351488d11c46f08fbf60";

describe("Aptos wallet derivation", () => {
    it("matches the shared Ledger-compatible BIP44 vector", async () => {
        const wallet = await createAptosWallet(KNOWN_MNEMONIC);

        expect(APTOS_DERIVATION_PATH).toBe("m/44'/637'/0'/0'/0'");
        expect(wallet).toEqual({
            address: EXPECTED_ADDRESS,
            publicKey: EXPECTED_PUBLIC_KEY,
            derivationPath: APTOS_DERIVATION_PATH,
            scheme: "Ed25519",
        });
    });

    it("rejects an invalid mnemonic", async () => {
        await expect(createAptosWallet("abandon abandon")).rejects.toThrow(/invalid_mnemonic/);
    });
});
