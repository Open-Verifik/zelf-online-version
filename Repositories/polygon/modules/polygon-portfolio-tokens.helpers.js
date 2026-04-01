/**
 * Portfolio token formatting and curated RPC selection for Polygon balance flows.
 */

const {
	COMMON_TOKENS_POLYGON,
	COMMON_TOKEN_METADATA_BY_ADDRESS_POLYGON,
	isCommonPolygonToken,
	isLikelyScamTokenName,
	USDC_BRIDGED,
	USDC_NATIVE,
	USDT,
	DAI,
	WETH,
	WMATIC,
} = require("./polygon-tokens.constants");

/** Prefer stables / wrapped majors first, then remaining curated list; cap eth_call volume per address. */
function prioritizeAndCapCuratedMissingForRpc(missingLowercased, max, onlyPriorityTokens) {
	if (!Array.isArray(missingLowercased) || missingLowercased.length === 0 || max <= 0) return [];

	const missingSet = new Set(missingLowercased.map((a) => String(a).toLowerCase()));

	if (onlyPriorityTokens) {
		const priority = [USDC_BRIDGED, USDC_NATIVE, USDT, DAI, WETH, WMATIC].map((a) => a.toLowerCase());

		return priority.filter((p) => missingSet.has(p)).slice(0, max);
	}

	const out = [];
	const priority = [USDC_BRIDGED, USDC_NATIVE, USDT, DAI, WETH, WMATIC, "0x1bfd67037b42cf73acf2047067bd4f2c47d9bfd6"].map((a) =>
		a.toLowerCase()
	);

	for (const p of priority) {
		if (missingSet.has(p) && !out.includes(p)) out.push(p);

		if (out.length >= max) return out;
	}

	for (const a of COMMON_TOKENS_POLYGON) {
		const al = String(a).toLowerCase();

		if (!missingSet.has(al) || out.includes(al)) continue;

		out.push(al);

		if (out.length >= max) break;
	}

	return out;
}

/**
 * Build a normalized Polygon portfolio token object from shared inputs.
 * @param {Object} input
 * @param {string} input.address
 * @param {number} input.amount
 * @param {number} input.decimals
 * @param {number} [input.price]
 * @param {string} [input.image]
 * @param {string} [input.name]
 * @param {string} [input.symbol]
 * @param {string} [input.tokenType]
 */
function buildPolygonPortfolioToken({ address, amount, decimals, price = 0, image = "", name = "", symbol = "", tokenType = "ERC-20" }) {
	const lowercasedAddress = String(address || "").toLowerCase();
	let finalPrice = Number(price || 0);

	// For curated stables, force $1.00 if price unavailable.
	if ((!finalPrice || finalPrice === 0) && (lowercasedAddress === USDC_BRIDGED || lowercasedAddress === USDC_NATIVE)) {
		finalPrice = 1;
	}

	const fiatBalance = Number(amount || 0) * finalPrice;
	const meta = COMMON_TOKEN_METADATA_BY_ADDRESS_POLYGON.get(lowercasedAddress) || {};

	return {
		_amount: Number(amount || 0),
		_fiatBalance: fiatBalance.toFixed(Math.min(decimals, 8)),
		_price: Number(finalPrice),
		address,
		amount: Number(amount || 0).toFixed(Math.min(decimals, 12)),
		decimals,
		fiatBalance,
		image: image || meta.image || "",
		name: name || meta.name || "",
		price: finalPrice,
		symbol: symbol || meta.symbol || "",
		tokenType,
	};
}

/**
 * Format Blockscout ERC-20 token rows for portfolio display (prices, filters, sort).
 * @param {Array} erc20Items - Blockscout `/tokens` API items
 * @param {Map<string, number>} coingeckoPriceMap - lowercased contract -> USD
 * @param {Set<string>} verifiedSet - lowercased verified contract addresses
 */
function formatBlockscoutErc20ItemsForPortfolio(erc20Items, coingeckoPriceMap, verifiedSet) {
	return erc20Items
		.reduce((acc, item) => {
			const token = item.token || {};
			const addr = (token.address || "").toLowerCase();
			const decimals = parseInt(token.decimals || 18);
			const rawAmount = item.value || 0;
			const amount = Number(rawAmount) / Math.pow(10, decimals);

			// Prefer CoinGecko price by contract; fallback to Blockscout exchange_rate
			const cgPrice = coingeckoPriceMap.get(addr) || 0;
			const price = cgPrice || Number(token.exchange_rate || item.token?.exchange_rate || 0) || 0;

			// Visibility filters
			const hasCgPrice = cgPrice > 0;
			const isVerified = verifiedSet.has(addr);
			const isCommon = isCommonPolygonToken(addr);
			const passesNameHeuristic = !isLikelyScamTokenName(token.name, token.symbol);
			const shouldKeep = (isCommon || hasCgPrice || isVerified) && (isCommon || passesNameHeuristic);

			if (!shouldKeep) return acc;

			acc.push(
				buildPolygonPortfolioToken({
					address: token.address,
					amount,
					decimals,
					price,
					image: token.icon_url || "",
					name: token.name || "",
					symbol: token.symbol || "",
					tokenType: token.type || "ERC-20",
				})
			);

			return acc;
		}, [])
		.sort((a, b) => Number(b.fiatBalance) - Number(a.fiatBalance));
}

module.exports = {
	buildPolygonPortfolioToken,
	prioritizeAndCapCuratedMissingForRpc,
	formatBlockscoutErc20ItemsForPortfolio,
};
