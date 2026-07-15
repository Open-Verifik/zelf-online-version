const { createTonWallet, TON_DERIVATION_PATH } = require("../../Repositories/Wallet/modules/ton");

describe("TON wallet derivation", () => {
	it("uses BIP44 path m/44'/607'/0'", () => {
		expect(TON_DERIVATION_PATH).toBe("m/44'/607'/0'");
	});

	it("derives a stable V5R1 bounceable address from a known mnemonic", async () => {
		const mnemonic = "abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon about";
		const wallet = await createTonWallet(mnemonic);

		expect(wallet.address).toBe("EQBHyu-oZVDHRYQ1-rKlGqpHy5yAqanPBirEQNMNOmfHLotW");
		expect(wallet.walletVersion).toBe("v5r1");
		expect(wallet.publicKey).toMatch(/^[0-9a-f]{64}$/i);
	});

	it("rejects empty mnemonic", async () => {
		await expect(createTonWallet("")).rejects.toThrow(/invalid_mnemonic/);
	});
});
