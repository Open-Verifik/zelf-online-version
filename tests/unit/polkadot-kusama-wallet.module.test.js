const {
	cryptoWaitReady,
	decodeAddress,
	encodeAddress,
	mnemonicToMiniSecret,
	sr25519PairFromSeed,
} = require("@polkadot/util-crypto");
const { generateMnemonic } = require("../../Repositories/Wallet/modules/helpers");
const {
	createPolkadotWallet,
	createKusamaWallet,
} = require("../../Repositories/Wallet/modules/polkadot-kusama");

describe("polkadot-kusama wallet module", () => {
	it("derives Polkadot and Kusama SS58 addresses from the same SR25519 key (prefix 0 vs 2)", async () => {
		const mnemonic = generateMnemonic(12);

		const polkadot = await createPolkadotWallet(mnemonic);
		const kusama = await createKusamaWallet(mnemonic);

		const publicKeyFromDot = decodeAddress(polkadot.address);
		const publicKeyFromKsm = decodeAddress(kusama.address);

		expect(publicKeyFromDot).toEqual(publicKeyFromKsm);

		expect(encodeAddress(publicKeyFromDot, 0)).toBe(polkadot.address);
		expect(encodeAddress(publicKeyFromDot, 2)).toBe(kusama.address);

		await cryptoWaitReady();
		const seed = mnemonicToMiniSecret(mnemonic);
		const pair = sr25519PairFromSeed(seed);

		expect(Buffer.from(pair.publicKey)).toEqual(Buffer.from(publicKeyFromDot));
		const expectedSecretHex = Buffer.from(pair.secretKey).toString("hex");
		expect(polkadot.secretKey).toBe(expectedSecretHex);
		expect(kusama.secretKey).toBe(expectedSecretHex);

		expect(polkadot.secretKey).toBe(kusama.secretKey);
		expect(polkadot.secretKey).toMatch(/^[0-9a-f]{128}$/);
	});
});
