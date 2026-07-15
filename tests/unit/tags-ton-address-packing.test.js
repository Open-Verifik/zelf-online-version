/**
 * Publish-safety tests for TON on tag address packing.
 * Uses the known BIP39 vector from Repositories/TON/README.md.
 *
 * Avoids requiring tags.module.js (pulls ESM stellar-hd-wallet into Jest).
 * Stellar / session / domain config are mocked so initTagUpdates (decryptTag backfill) can run.
 */
jest.mock("../../Repositories/Wallet/modules/stellar", () => ({
	createStellarWallet: () => ({
		address: "GB3JDWCQJCWMJ3IILWIGDTQJJC5567PGVEVXSCVPEQOTDN64VJBDQBYX",
		secretKey: "mock-stellar-secret",
	}),
	healPublicDataXlm: (publicData) => ({
		stellar: {
			address: publicData.xlmAddress || "GB3JDWCQJCWMJ3IILWIGDTQJJC5567PGVEVXSCVPEQOTDN64VJBDQBYX",
			secretKey: "mock-stellar-secret",
		},
		shouldPersistXlm: false,
		hadXlmBeforeHeal: Boolean(publicData.xlmAddress),
	}),
}));

jest.mock("../../Repositories/Session/modules/session.module", () => ({
	walletEncrypt: jest.fn(async () => ({
		encryptedMessage: "mock-encrypted-message",
		privateKey: "mock-private-key",
	})),
}));

jest.mock("../../Repositories/Tags/config/supported-domains", () => ({
	getDomainConfig: () => ({
		name: "zelf",
		getTagKey: () => "tagName",
		tags: { storage: { keyPrefix: "tagName" } },
	}),
}));

const TagsPartsModule = require("../../Repositories/Tags/modules/tags-parts.module");
const { initTagUpdates } = require("../../Repositories/Tags/modules/sync-tag-records.module");
const { createEthWallet } = require("../../Repositories/Wallet/modules/eth");
const { createBTCWallet } = require("../../Repositories/Wallet/modules/btc");
const { createSolanaWallet } = require("../../Repositories/Wallet/modules/solana");
const { generateSuiWalletFromMnemonic } = require("../../Repositories/Wallet/modules/sui");
const { createStellarWallet } = require("../../Repositories/Wallet/modules/stellar");
const { createPolkadotWallet, createKusamaWallet } = require("../../Repositories/Wallet/modules/polkadot-kusama");
const { createTonWallet } = require("../../Repositories/Wallet/modules/ton");
const ArweaveModule = require("../../Repositories/Arweave/modules/arweave.module");
const {
	PINATA_KEYVALUE_MAX_LENGTH,
	ADDRESS_CHUNK_KEYS,
	TOP_LEVEL_ADDRESS_FIELDS,
	buildAddressKeyvalues,
	mergeAddressKeyvaluesIntoPublicData,
} = require("../../Repositories/Tags/modules/tags-addresses.module");

const KNOWN_MNEMONIC = "abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon about";
const EXPECTED_TON_ADDRESS = "EQBHyu-oZVDHRYQ1-rKlGqpHy5yAqanPBirEQNMNOmfHLotW";

const mockDomainConfig = {
	name: "zelf",
	tags: { storage: { keyPrefix: "tagName" } },
	getPrice: () => ({ price: 0, reward: 0, discount: 0, discountType: null }),
};

/** Mirrors TagsModule._createWalletsFromPhrase without loading tags.module. */
const createWalletsFromPhrase = async (mnemonic) => {
	const [eth, btc, solana, sui, polkadot, kusama, ton, arweave] = await Promise.all([
		createEthWallet(mnemonic),
		createBTCWallet(mnemonic),
		createSolanaWallet(mnemonic),
		generateSuiWalletFromMnemonic(mnemonic),
		createPolkadotWallet(mnemonic),
		createKusamaWallet(mnemonic),
		createTonWallet(mnemonic),
		ArweaveModule.generateWalletFromMnemonic(mnemonic),
	]);
	const stellar = createStellarWallet(mnemonic);
	return { eth, btc, solana, sui, stellar, polkadot, kusama, ton, arweave };
};

const sourceFromWallets = (wallets, { includeTon = true } = {}) => {
	const source = {
		ethAddress: wallets.eth.address,
		solanaAddress: wallets.solana.address,
		btcAddress: wallets.btc.address,
		arweaveAddress: wallets.arweave.address,
		suiAddress: wallets.sui.address,
		xlmAddress: wallets.stellar.address,
		dotAddress: wallets.polkadot.address,
		ksmAddress: wallets.kusama.address,
	};
	if (includeTon) source.tonAddress = wallets.ton.address;
	return source;
};

const assertChunksWithinLimit = (kv) => {
	const present = ADDRESS_CHUNK_KEYS.filter((key) => kv[key]);
	expect(present.length).toBeGreaterThan(0);
	expect(present.length).toBeLessThanOrEqual(ADDRESS_CHUNK_KEYS.length);

	for (const key of present) {
		expect(kv[key].length).toBeLessThanOrEqual(PINATA_KEYVALUE_MAX_LENGTH);
	}

	return present;
};

describe("TON tag address packing (publish safety)", () => {
	let wallets;

	beforeAll(async () => {
		wallets = await createWalletsFromPhrase(KNOWN_MNEMONIC);
	}, 120000);

	describe("Test A — new lease wallets", () => {
		it("returns ton matching the README vector", () => {
			expect(wallets.ton).toBeDefined();
			expect(wallets.ton.address).toBe(EXPECTED_TON_ADDRESS);
		});

		it("assignProperties sets tagObject.tonAddress", () => {
			const tagObject = { tagName: "publish-safety.ton", domain: "zelf" };
			const dataToEncrypt = { publicData: tagObject, metadata: { mnemonic: KNOWN_MNEMONIC } };

			TagsPartsModule.assignProperties(
				tagObject,
				dataToEncrypt,
				{
					eth: wallets.eth,
					btc: wallets.btc,
					solana: wallets.solana,
					sui: wallets.sui,
					stellar: wallets.stellar,
					arweave: wallets.arweave,
					polkadot: wallets.polkadot,
					kusama: wallets.kusama,
					ton: wallets.ton,
				},
				{ password: "test" },
				mockDomainConfig
			);

			expect(tagObject.tonAddress).toBe(EXPECTED_TON_ADDRESS);
		});
	});

	describe("Test B — Pinata 250-char limit with full address set", () => {
		it("packs all chains including TON within 250 chars and at most 3 chunks", () => {
			const source = sourceFromWallets(wallets, { includeTon: true });
			const kv = buildAddressKeyvalues(source);

			const present = assertChunksWithinLimit(kv);
			const chunkBlob = present.map((key) => kv[key]).join("");

			expect(chunkBlob).toContain('"ton"');
			expect(chunkBlob).toContain(EXPECTED_TON_ADDRESS);

			expect(kv.ethAddress).toBe(source.ethAddress);
			expect(kv.solanaAddress).toBe(source.solanaAddress);
			expect(kv.btcAddress).toBeUndefined();
			expect(kv.tonAddress).toBeUndefined();

			for (const top of TOP_LEVEL_ADDRESS_FIELDS) {
				expect(kv[top]).toBe(source[top]);
			}

			const merged = mergeAddressKeyvaluesIntoPublicData({ ...kv });
			expect(merged.tonAddress).toBe(EXPECTED_TON_ADDRESS);
			expect(merged.ethAddress).toBe(source.ethAddress);
			expect(merged.solanaAddress).toBe(source.solanaAddress);
			expect(merged.addresses).toBeUndefined();
			expect(merged.ton).toBeUndefined();
		});
	});

	describe("Test C — backfill for tags missing TON", () => {
		it("adds tonAddress then packs and merges within Pinata limits", async () => {
			const legacy = sourceFromWallets(wallets, { includeTon: false });
			expect(legacy.tonAddress).toBeUndefined();

			const ton = await createTonWallet(KNOWN_MNEMONIC);
			legacy.tonAddress = ton.address;

			const kv = buildAddressKeyvalues(legacy);
			assertChunksWithinLimit(kv);

			const chunkBlob = ADDRESS_CHUNK_KEYS.map((key) => kv[key] || "").join("");
			expect(chunkBlob).toContain('"ton"');
			expect(chunkBlob).toContain(EXPECTED_TON_ADDRESS);

			const merged = mergeAddressKeyvaluesIntoPublicData({ ...kv });
			expect(merged.tonAddress).toBe(EXPECTED_TON_ADDRESS);
		});
	});

	describe("Test D — assignProperties + buildAddressKeyvalues integration", () => {
		it("registration metadata shape includes TON in chunked addresses", () => {
			const tagObject = { tagName: "publish-safety.ton", domain: "zelf" };
			const dataToEncrypt = { publicData: tagObject, metadata: { mnemonic: KNOWN_MNEMONIC } };

			TagsPartsModule.assignProperties(
				tagObject,
				dataToEncrypt,
				{
					eth: wallets.eth,
					btc: wallets.btc,
					solana: wallets.solana,
					sui: wallets.sui,
					stellar: wallets.stellar,
					arweave: wallets.arweave,
					polkadot: wallets.polkadot,
					kusama: wallets.kusama,
					ton: wallets.ton,
				},
				{ password: "test" },
				mockDomainConfig
			);

			// Same shape confirmFreeTag / updateTags spread into Pinata metadata
			const metadata = {
				tagName: tagObject.tagName,
				domain: tagObject.domain,
				...buildAddressKeyvalues(tagObject),
			};

			expect(metadata.ethAddress).toBe(tagObject.ethAddress);
			expect(metadata.solanaAddress).toBe(tagObject.solanaAddress);
			assertChunksWithinLimit(metadata);

			const chunkBlob = ADDRESS_CHUNK_KEYS.map((key) => metadata[key] || "").join("");
			expect(chunkBlob).toContain('"ton"');
			expect(chunkBlob).toContain(EXPECTED_TON_ADDRESS);

			const merged = mergeAddressKeyvaluesIntoPublicData({
				ethAddress: metadata.ethAddress,
				solanaAddress: metadata.solanaAddress,
				addresses: metadata.addresses,
				addresses2: metadata.addresses2,
				addresses3: metadata.addresses3,
			});
			expect(merged.tonAddress).toBe(EXPECTED_TON_ADDRESS);
		});
	});

	describe("Test E — initTagUpdates backfill (decryptTag path)", () => {
		it("adds tonAddress to tagsToAdd when publicData is missing it", async () => {
			const full = sourceFromWallets(wallets, { includeTon: false });
			const tagObject = {
				publicData: {
					tagName: "legacy-missing-ton.zelf",
					domain: "zelf",
					...full,
				},
			};

			expect(tagObject.publicData.tonAddress).toBeUndefined();

			const { tagsToAdd } = await initTagUpdates(tagObject, {
				mnemonic: KNOWN_MNEMONIC,
				zkProof: "mock-zk",
				solanaSecretKey: "mock-sol-secret",
				arweavePrivateKey: "mock-arweave-secret",
				password: "test",
			});

			const tonEntry = tagsToAdd.find((t) => t.name === "tonAddress");
			expect(tonEntry).toEqual({
				name: "tonAddress",
				value: EXPECTED_TON_ADDRESS,
				new: true,
			});
			expect(tagObject.publicData.tonAddress).toBe(EXPECTED_TON_ADDRESS);

			// Same packing updateTags would use after backfill
			const kv = buildAddressKeyvalues(tagObject.publicData);
			assertChunksWithinLimit(kv);
			const chunkBlob = ADDRESS_CHUNK_KEYS.map((key) => kv[key] || "").join("");
			expect(chunkBlob).toContain('"ton"');
			expect(chunkBlob).toContain(EXPECTED_TON_ADDRESS);
		});

		it("does not re-add tonAddress when it is already present", async () => {
			const full = sourceFromWallets(wallets, { includeTon: true });
			const tagObject = {
				publicData: {
					tagName: "already-has-ton.zelf",
					domain: "zelf",
					...full,
				},
			};

			const { tagsToAdd } = await initTagUpdates(tagObject, {
				mnemonic: KNOWN_MNEMONIC,
				zkProof: "mock-zk",
				solanaSecretKey: "mock-sol-secret",
				arweavePrivateKey: "mock-arweave-secret",
				password: "test",
			});

			expect(tagsToAdd.find((t) => t.name === "tonAddress")).toBeUndefined();
			expect(tagObject.publicData.tonAddress).toBe(EXPECTED_TON_ADDRESS);
		});
	});
});
