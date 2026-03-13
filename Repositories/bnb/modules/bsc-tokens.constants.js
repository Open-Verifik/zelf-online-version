// Curated token data for BNB Chain (BSC). Keep this file focused on constants and simple helpers only.

// Key token addresses (lowercased)
const USDT = "0x55d398326f99059ff775485246999027b3197955";
const USDC = "0x8ac76a51cc950d9822d68b83fe1ad97b32cd580d";
const BUSD = "0xe9e7cea3dedca5984780bafc599bd69add087d56"; // legacy
const DAI = "0x1af3f329e8be154074d8769d1ffa4ee058b1dbc3";
const WBNB = "0xbb4cdb9cbd36b01bd1cbaebf2de08d9173bc095c";
const BTCB = "0x7130d2a12b9bcbfae4f2634d864a1ee1ce3ead9c";
const ETH_PEG = "0x2170ed0880ac9a755fd29b2688956bd959f933f8"; // Binance-Peg ETH
const CAKE = "0x0e09fabb73bd3ade0a17ecc321fd13a19e81ce82";
const POSI = "0x5ca42204cdaa70d5c773946e69de942b85ca6706";
const DOGE = "0xba2ae424d960c26247dd6c32edc70b295c744c43";

// Common tokens set
const COMMON_TOKENS_BSC = new Set([
  USDT,
  USDC,
  BUSD,
  DAI,
  WBNB,
  BTCB,
  ETH_PEG,
  CAKE,
  POSI,
  DOGE,
]);

// CoinGecko ID map for curated tokens (address -> id)
const COMMON_TOKEN_ID_BY_ADDRESS_BSC = new Map([
  [USDT, "tether"],
  [USDC, "usd-coin"],
  [BUSD, "binance-usd"],
  [DAI, "dai"],
  [WBNB, "wbnb"],
  [BTCB, "binance-bitcoin"],
  [ETH_PEG, "ethereum"],
  [CAKE, "pancakeswap-token"],
  [POSI, "position-token"],
  [DOGE, "dogecoin"],
]);

// Decimals for curated tokens (used for RPC/scan formatting fallbacks)
const COMMON_TOKEN_DECIMALS_BY_ADDRESS_BSC = new Map([
  [USDT, 18],
  [USDC, 18],
  [BUSD, 18],
  [DAI, 18],
  [WBNB, 18],
  [BTCB, 18],
  [ETH_PEG, 18],
  [CAKE, 18],
  [POSI, 18],
  [DOGE, 8],
]);

// Optional basic metadata
const COMMON_TOKEN_METADATA_BY_ADDRESS_BSC = new Map([
  [USDT, { symbol: "USDT", name: "Tether", image: "https://s2.coinmarketcap.com/static/img/coins/64x64/825.png" }],
  [USDC, { symbol: "USDC", name: "USD Coin", image: "https://s2.coinmarketcap.com/static/img/coins/64x64/3408.png" }],
  [BUSD, { symbol: "BUSD", name: "Binance USD", image: "https://s2.coinmarketcap.com/static/img/coins/64x64/4687.png" }],
  [DAI, { symbol: "DAI", name: "Dai", image: "https://s2.coinmarketcap.com/static/img/coins/64x64/4943.png" }],
  [WBNB, { symbol: "WBNB", name: "Wrapped BNB", image: "https://s2.coinmarketcap.com/static/img/coins/64x64/1839.png" }],
  [BTCB, { symbol: "BTCB", name: "Bitcoin (BSC)", image: "https://s2.coinmarketcap.com/static/img/coins/64x64/1.png" }],
  [ETH_PEG, { symbol: "ETH", name: "Ethereum (BSC)", image: "https://s2.coinmarketcap.com/static/img/coins/64x64/1027.png" }],
  [CAKE, { symbol: "CAKE", name: "PancakeSwap", image: "https://s2.coinmarketcap.com/static/img/coins/64x64/7186.png" }],
  [POSI, { symbol: "POSI", name: "Position", image: "" }],
  [DOGE, { symbol: "DOGE", name: "Dogecoin (BSC)", image: "https://s2.coinmarketcap.com/static/img/coins/64x64/74.png" }],
]);

// Helpers
function isCommonBscToken(address) {
  return COMMON_TOKENS_BSC.has((address || "").toLowerCase());
}

function isLikelyScamTokenName(name = "", symbol = "") {
  const n = String(name).toLowerCase();
  const s = String(symbol).toLowerCase();
  const suspicious = [".io", ".org", ".net", ".online", "swap", "dividend", "tracker", "airdrop", "promo", "get rich"];
  return suspicious.some((p) => n.includes(p) || s.includes(p));
}

module.exports = {
  COMMON_TOKENS_BSC,
  COMMON_TOKEN_ID_BY_ADDRESS_BSC,
  COMMON_TOKEN_DECIMALS_BY_ADDRESS_BSC,
  COMMON_TOKEN_METADATA_BY_ADDRESS_BSC,
  isCommonBscToken,
  isLikelyScamTokenName,
  USDT,
  USDC,
  BUSD,
  DAI,
  WBNB,
  BTCB,
  ETH_PEG,
  CAKE,
  POSI,
  DOGE,
};


