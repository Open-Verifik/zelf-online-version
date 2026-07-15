const { getCleanInstance } = require("../../../Core/axios");
const { tonApiGet } = require("./ton-api.client");

const instance = getCleanInstance(30000);

const normalizeTokenKey = (address) => String(address || "").trim().toLowerCase();

const parseRatesMap = (ratesPayload = {}) => {
	const map = {};
	for (const [token, rate] of Object.entries(ratesPayload?.rates || {})) {
		const usd = rate?.prices?.USD;
		if (usd != null) map[normalizeTokenKey(token)] = Number(usd);
	}
	return map;
};

const chunk = (items, size) => {
	const out = [];
	for (let i = 0; i < items.length; i += size) out.push(items.slice(i, i + size));
	return out;
};

/**
 * Native TON/USD — TonAPI first (already used for scrapping), then Binance global fallback.
 * Binance US does not list TONUSDT.
 */
const getTonUsdPrice = async () => {
	try {
		const data = await tonApiGet("/rates", { tokens: "ton", currencies: "usd" });
		const price = data?.rates?.TON?.prices?.USD;
		if (price != null) return String(price);
	} catch (error) {
		console.error("TON TonAPI rate:", error.message);
	}

	try {
		const { data } = await instance.get("https://api.binance.com/api/v3/ticker/price?symbol=TONUSDT");
		if (data?.price) return String(data.price);
	} catch (error) {
		console.error("TON Binance global rate:", error.message);
	}

	return "0";
};

/**
 * Batch USD rates for jetton master addresses (raw 0:… or friendly EQ…).
 */
const getJettonUsdRates = async (jettonAddresses = []) => {
	const unique = [...new Set(jettonAddresses.map(normalizeTokenKey).filter(Boolean))];
	if (!unique.length) return {};

	const merged = {};
	for (const group of chunk(unique, 25)) {
		try {
			const data = await tonApiGet("/rates", {
				tokens: group.join(","),
				currencies: "usd",
			});
			Object.assign(merged, parseRatesMap(data));
		} catch (error) {
			console.error("TON jetton rates:", error.message);
		}
	}
	return merged;
};

const sumTokenFiatBalances = (tokens = []) =>
	parseFloat(
		tokens.reduce((sum, token) => sum + Number(token?.fiatBalance || 0), 0).toFixed(4),
	);

module.exports = {
	getTonUsdPrice,
	getJettonUsdRates,
	parseRatesMap,
	sumTokenFiatBalances,
	normalizeTokenKey,
};
