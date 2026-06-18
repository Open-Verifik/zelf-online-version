const {
	parseRatesMap,
	sumTokenFiatBalances,
	normalizeTokenKey,
} = require("../../Repositories/TON/modules/ton-price.util");

describe("ton-price.util", () => {
	test("parseRatesMap normalizes token keys to lowercase", () => {
		const map = parseRatesMap({
			rates: {
				TON: { prices: { USD: 1.62 } },
				"0:abc": { prices: { USD: 0.99 } },
			},
		});
		expect(map.ton).toBe(1.62);
		expect(map["0:abc"]).toBe(0.99);
	});

	test("sumTokenFiatBalances totals per-token fiat values", () => {
		const total = sumTokenFiatBalances([
			{ fiatBalance: 1.5 },
			{ fiatBalance: 2.25 },
			{ fiatBalance: 0 },
		]);
		expect(total).toBe(3.75);
	});

	test("normalizeTokenKey trims and lowercases", () => {
		expect(normalizeTokenKey(" EQabc ")).toBe("eqabc");
	});
});
