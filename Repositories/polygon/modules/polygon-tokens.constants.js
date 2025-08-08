// Curated token data for Polygon. Keep this file focused on constants and simple helpers only.

// Common token addresses on Polygon (lowercased)
const COMMON_TOKENS_POLYGON = new Set([
	// Stables & majors
	"0x2791bca1f2de4661ed88a30c99a7a9449aa84174", // USDC (bridged)
	"0xc2132d05d31c914a87c6611c10748aeb04b58e8f", // USDT
	"0x3c499c542cef5e3811e1192ce70d8cc03d5c3359", // USDC (native)
	"0x8f3cf7ad23cd3cadbd9735aff958023239c6a063", // DAI
	// Wrapped
	"0x7ceb23fd6bc0add59e62ac25578270cff1b9f619", // WETH
	"0x0d500b1d8e8ef31e21c99d1db9a6444d3adf1270", // WMATIC
	"0x1bfd67037b42cf73acf2047067bd4f2c47d9bfd6", // WBTC
	// Blue-chips / ecosystem
	"0xd6df932a45c0f255f85145f286ea0b292b21c90b", // AAVE
	"0x53e0bca35ec356bd5dddfebbd1fc0fd03fabad39", // LINK
	"0x0b3f868e0be5597d5db7feb59e1cadbb0fdda50a", // SUSHI
	"0xb33eaad8d922b1083446dc23f610c2567fb5180f", // UNI
	"0x172370d5cd63279efa6d502dab29171933a610af", // CRV
	"0x9a71012b13ca4d3d0cdc72a177df3ef03b0e76a3", // BAL
	"0x831753dd7087cac61ab5644b308642cc1c33dc13", // QUICK (legacy)
	"0xa1c57f48f0deb89f569dfbe6e2b7f46d33606fd4", // MANA
	"0xbbba073c31bf03b8acf7c28ef0738decf3695683", // SAND
	"0x385eeac5cb2d6e39bddc9f3c5f1a0ad31dc72d31", // GHST
	"0xa3fa99a148fa48d14ed51d610c367c61876997f1", // MAI
	"0x2e1ad108ff1d8c782fcbbb89aad783ac49586756", // TUSD
]);

// Mapping common token address -> CoinGecko ID for fallback pricing
const COMMON_TOKEN_ID_BY_ADDRESS_POLYGON = new Map([
	["0x2791bca1f2de4661ed88a30c99a7a9449aa84174", "usd-coin"],
	["0xc2132d05d31c914a87c6611c10748aeb04b58e8f", "tether"],
	["0x3c499c542cef5e3811e1192ce70d8cc03d5c3359", "usd-coin"],
	["0x8f3cf7ad23cd3cadbd9735aff958023239c6a063", "dai"],
	["0x7ceb23fd6bc0add59e62ac25578270cff1b9f619", "weth"],
	["0x0d500b1d8e8ef31e21c99d1db9a6444d3adf1270", "wmatic"],
	["0x1bfd67037b42cf73acf2047067bd4f2c47d9bfd6", "wrapped-bitcoin"],
	["0xd6df932a45c0f255f85145f286ea0b292b21c90b", "aave"],
	["0x53e0bca35ec356bd5dddfebbd1fc0fd03fabad39", "chainlink"],
	["0x0b3f868e0be5597d5db7feb59e1cadbb0fdda50a", "sushi"],
	["0xb33eaad8d922b1083446dc23f610c2567fb5180f", "uniswap"],
	["0x172370d5cd63279efa6d502dab29171933a610af", "curve-dao-token"],
	["0x9a71012b13ca4d3d0cdc72a177df3ef03b0e76a3", "balancer"],
	["0x831753dd7087cac61ab5644b308642cc1c33dc13", "quick"],
	["0xa1c57f48f0deb89f569dfbe6e2b7f46d33606fd4", "decentraland"],
	["0xbbba073c31bf03b8acf7c28ef0738decf3695683", "the-sandbox"],
	["0x385eeac5cb2d6e39bddc9f3c5f1a0ad31dc72d31", "aavegotchi"],
	["0xa3fa99a148fa48d14ed51d610c367c61876997f1", "mai"],
	["0x2e1ad108ff1d8c782fcbbb89aad783ac49586756", "true-usd"],
]);

// Decimals for curated tokens (for RPC/Polygonscan formatting fallbacks)
const COMMON_TOKEN_DECIMALS_BY_ADDRESS_POLYGON = new Map([
	["0x2791bca1f2de4661ed88a30c99a7a9449aa84174", 6], // USDC (bridged)
	["0x3c499c542cef5e3811e1192ce70d8cc03d5c3359", 6], // USDC (native)
	["0xc2132d05d31c914a87c6611c10748aeb04b58e8f", 6], // USDT
	["0x8f3cf7ad23cd3cadbd9735aff958023239c6a063", 18], // DAI
	["0x7ceb23fd6bc0add59e62ac25578270cff1b9f619", 18], // WETH
	["0x0d500b1d8e8ef31e21c99d1db9a6444d3adf1270", 18], // WMATIC
	["0x1bfd67037b42cf73acf2047067bd4f2c47d9bfd6", 8], // WBTC
	["0xd6df932a45c0f255f85145f286ea0b292b21c90b", 18], // AAVE
	["0x53e0bca35ec356bd5dddfebbd1fc0fd03fabad39", 18], // LINK
	["0x0b3f868e0be5597d5db7feb59e1cadbb0fdda50a", 18], // SUSHI
	["0xb33eaad8d922b1083446dc23f610c2567fb5180f", 18], // UNI
	["0x172370d5cd63279efa6d502dab29171933a610af", 18], // CRV
	["0x9a71012b13ca4d3d0cdc72a177df3ef03b0e76a3", 18], // BAL
	["0x831753dd7087cac61ab5644b308642cc1c33dc13", 18], // QUICK
	["0xa1c57f48f0deb89f569dfbe6e2b7f46d33606fd4", 18], // MANA
	["0xbbba073c31bf03b8acf7c28ef0738decf3695683", 18], // SAND
	["0x385eeac5cb2d6e39bddc9f3c5f1a0ad31dc72d31", 18], // GHST
	["0xa3fa99a148fa48d14ed51d610c367c61876997f1", 18], // MAI
	["0x2e1ad108ff1d8c782fcbbb89aad783ac49586756", 18], // TUSD
]);

// Basic metadata for curated tokens
const COMMON_TOKEN_METADATA_BY_ADDRESS_POLYGON = new Map([
	[
		"0x2791bca1f2de4661ed88a30c99a7a9449aa84174",
		{ symbol: "USDC", name: "USD Coin", image: "https://s2.coinmarketcap.com/static/img/coins/64x64/3408.png" },
	],
	[
		"0x3c499c542cef5e3811e1192ce70d8cc03d5c3359",
		{ symbol: "USDC", name: "USD Coin", image: "https://s2.coinmarketcap.com/static/img/coins/64x64/3408.png" },
	],
	[
		"0xc2132d05d31c914a87c6611c10748aeb04b58e8f",
		{ symbol: "USDT", name: "Tether", image: "https://s2.coinmarketcap.com/static/img/coins/64x64/825.png" },
	],
	[
		"0x8f3cf7ad23cd3cadbd9735aff958023239c6a063",
		{ symbol: "DAI", name: "Dai", image: "https://s2.coinmarketcap.com/static/img/coins/64x64/4943.png" },
	],
]);

// Helpers
function isCommonPolygonToken(address) {
	return COMMON_TOKENS_POLYGON.has((address || "").toLowerCase());
}

function isLikelyScamTokenName(name = "", symbol = "") {
	const n = String(name).toLowerCase();
	const s = String(symbol).toLowerCase();
	const suspiciousPatterns = [".io", ".org", ".net", ".online", "swap", "dividend", "tracker", "airdrop", "promo", "get rich"];
	return suspiciousPatterns.some((p) => n.includes(p) || s.includes(p));
}

const USDC_BRIDGED = "0x2791bca1f2de4661ed88a30c99a7a9449aa84174";
const USDC_NATIVE = "0x3c499c542cef5e3811e1192ce70d8cc03d5c3359";

module.exports = {
	COMMON_TOKENS_POLYGON,
	COMMON_TOKEN_ID_BY_ADDRESS_POLYGON,
	COMMON_TOKEN_DECIMALS_BY_ADDRESS_POLYGON,
	COMMON_TOKEN_METADATA_BY_ADDRESS_POLYGON,
	isCommonPolygonToken,
	isLikelyScamTokenName,
	USDC_BRIDGED,
	USDC_NATIVE,
};
