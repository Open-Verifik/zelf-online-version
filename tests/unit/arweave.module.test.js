const { generateWalletFromMnemonic } = require("../../Repositories/Arweave/modules/arweave.module");

describe("Arweave Module Unit Tests", () => {
	jest.setTimeout(120000); // Ensure long timeout for RSA generation
	const staticMnemonic = "hood hand multiply source goddess panic solar foil fossil jungle shield swing"; // Valid BIP39 mnemonic

	test("should generate deterministic Arweave wallet from mnemonic", async () => {
		// First generation
		const start = Date.now();
		const wallet1 = await generateWalletFromMnemonic(staticMnemonic);
		const end = Date.now();
		console.log(`Generation took ${end - start}ms`);

		expect(wallet1).toBeDefined();
		expect(wallet1.address).toBeDefined();
		expect(wallet1.privateKey).toBeDefined();

		// Check address format (Arweave addresses are 43 chars Base64URL)
		expect(wallet1.address).toMatch(/^[a-zA-Z0-9_-]{43}$/);

		// Check private key structure (JWK)
		expect(wallet1.privateKey.kty).toBe("RSA");
		expect(wallet1.privateKey.n).toBeDefined();
		expect(wallet1.privateKey.d).toBeDefined();

		// Second generation (Determinism check)
		const wallet2 = await generateWalletFromMnemonic(staticMnemonic);

		expect(wallet2.address).toBe(wallet1.address);
		expect(wallet2.privateKey.n).toBe(wallet1.privateKey.n);
		expect(wallet2.privateKey.d).toBe(wallet1.privateKey.d);
	}, 120000); // 120s timeout for safety
});
