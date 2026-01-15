const Arweave = require("arweave");

describe("Arweave Native Generation Test", () => {
	// Initialize Arweave instance
	const arweave = Arweave.init({
		host: "arweave.net",
		port: 443,
		protocol: "https",
	});

	test("should generate a random wallet using arweave.wallets.generate()", async () => {
		console.log("Generating random Arweave wallet (Native)...");
		const start = Date.now();

		// Native generation (non-deterministic)
		const jwk = await arweave.wallets.generate();

		const end = Date.now();
		console.log(`Native Generation took ${end - start}ms`);

		expect(jwk).toBeDefined();
		expect(jwk.kty).toBe("RSA");
		expect(jwk.n).toBeDefined();
		expect(jwk.d).toBeDefined(); // Private key component

		// Get address
		const address = await arweave.wallets.jwkToAddress(jwk);
		console.log("Native Address:", address);
	}, 60000);

	test("should generate deterministic wallet from mnemonic (Custom)", async () => {
		const { generateWalletFromMnemonic } = require("../../Repositories/Arweave/modules/arweave.module");
		const mnemonic = "hood hand multiply source goddess panic solar foil fossil jungle shield swing";

		console.log("Generating deterministic wallet from mnemonic (Custom)...");
		const start = Date.now();

		const wallet = await generateWalletFromMnemonic(mnemonic);

		const end = Date.now();
		console.log(`Custom Generation took ${end - start}ms`);

		expect(wallet).toBeDefined();
		expect(wallet.address).toBeDefined();
		expect(wallet.privateKey).toBeDefined();

		const jwk = wallet.privateKey;
		expect(jwk.kty).toBe("RSA");
		expect(jwk.n).toBeDefined();

		console.log({ jwk });

		console.log("Custom Address:", wallet.address);

		// Validate the key is functional by signing and verifying a message
		console.log("Validating key capabilities (Sign/Verify)...");
		const data = new TextEncoder().encode("Hello Arweave");
		const signature = await arweave.crypto.sign(jwk, data);
		const isValid = await arweave.crypto.verify(jwk.n, data, signature);

		console.log("Key validation (Signature verify):", isValid);
		expect(isValid).toBe(true);
	}, 120000);
});
