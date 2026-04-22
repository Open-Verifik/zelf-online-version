/**
 * Source A (Trust Wallet RPC) returns balances only — no token name/symbol/logo.
 * Without `solana-spl-known-metadata`, ZNS shows up as a generic "SPL <mint>" row.
 *
 * Manual QA reference: lookup `one610.zelf` → take its Solana address →
 * `GET /api/solana/address/<address>?source=sourceA` → ZNS row should have
 * symbol "ZNS" / name "Zelf" (mirrors the OkLink response).
 */
const { parsedTokenAccountsToHoldings } = require("../../Repositories/Solana/modules/solana-source-a-rpc.module");
const { ZNS_MAINNET_MINT, WSOL_MINT } = require("../../Repositories/Solana/modules/solana-spl-known-metadata");

const owner = "5d1jNutWr7jEGxrzjGGGLb1fVe8mqHxK6wsdcQ2x4Eak";

const accountFor = (mint, { decimals = 9, uiAmount = 1, amount = "1000000000", pubkey = "PubKeyXYZ" } = {}) => ({
	pubkey,
	account: {
		data: {
			parsed: {
				info: {
					mint,
					state: "initialized",
					tokenAmount: { amount, decimals, uiAmount },
				},
			},
		},
	},
});

describe("parsedTokenAccountsToHoldings", () => {
	it("labels the ZNS mint as Zelf/ZNS instead of generic SPL", () => {
		const result = parsedTokenAccountsToHoldings(owner, [
			accountFor(ZNS_MAINNET_MINT, { decimals: 9, uiAmount: 136.0135, amount: "136013500000", pubkey: "GeMiVTLQZFYQ9ZkHtwhQWEd1H8EJ8CD4grA6618xz9SA" }),
		]);

		expect(result.tokens).toHaveLength(1);
		const [zns] = result.tokens;
		expect(zns).toMatchObject({
			name: "Zelf",
			symbol: "ZNS",
			tokenAddress: ZNS_MAINNET_MINT,
			tokenType: "SPL",
			amount: 136.0135,
			owner,
		});
		expect(zns.image).toMatch(/^https?:\/\//);
	});

	it("labels Wrapped SOL with WSOL display metadata", () => {
		const [wsol] = parsedTokenAccountsToHoldings(owner, [accountFor(WSOL_MINT, { decimals: 9, uiAmount: 0.00011, amount: "110000" })]).tokens;

		expect(wsol).toMatchObject({ name: "Wrapped SOL", symbol: "WSOL", tokenAddress: WSOL_MINT });
	});

	it("labels static popular mints (e.g. USDC) without needing Jupiter", () => {
		const usdc = "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v";
		const [row] = parsedTokenAccountsToHoldings(owner, [accountFor(usdc, { decimals: 6, uiAmount: 12.5, amount: "12500000" })]).tokens;
		expect(row).toMatchObject({ name: "USD Coin", symbol: "USDC", tokenAddress: usdc, tokenType: "SPL" });
		expect(row.image).toContain("oklink.com");
		expect(row.symbol).not.toBe("SPL");
	});

	it("falls back to generic SPL placeholders for unknown mints", () => {
		const unknownMint = "5XZw2LKTyrfvfiskJ78AMpackRjPcyCif1WhUsPDuVqQ";
		const [unknown] = parsedTokenAccountsToHoldings(owner, [accountFor(unknownMint, { decimals: 6, uiAmount: 0.00000402, amount: "4" })]).tokens;

		expect(unknown.symbol).toBe("SPL");
		expect(unknown.name).toMatch(/^SPL /);
		expect(unknown.tokenAddress).toBe(unknownMint);
		expect(unknown.image).toBe("");
	});

	it("skips uninitialized accounts", () => {
		const row = accountFor(ZNS_MAINNET_MINT);
		row.account.data.parsed.info.state = "uninitialized";
		const result = parsedTokenAccountsToHoldings(owner, [row]);
		expect(result.tokens).toHaveLength(0);
	});
});
