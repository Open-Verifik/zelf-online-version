const {
	mapGasOracleToTrackerShape,
	weiHexToGwei,
	gasTrackerFromNetworkGwei,
} = require("../../Repositories/etherscan/modules/etherscan-gas-tracker.util");

describe("etherscan-gas-tracker.util", () => {
	describe("mapGasOracleToTrackerShape", () => {
		it("maps Etherscan gas oracle result to wallet-compatible shape", () => {
			const result = {
				SafeGasPrice: "12",
				ProposeGasPrice: "15",
				FastGasPrice: "18",
				suggestBaseFee: "10.5",
			};

			const out = mapGasOracleToTrackerShape(result);

			expect(out.low.gwei).toBe("12");
			expect(out.average.gwei).toBe("15");
			expect(out.high.gwei).toBe("18");
			expect(out.average.base).toBe("10.5");
			expect(out.featuredActions).toEqual([]);
			expect(parseFloat(out.average.priority)).toBeCloseTo(4.5, 5);
		});

		it("returns null when ProposeGasPrice is missing", () => {
			expect(mapGasOracleToTrackerShape({ SafeGasPrice: "1" })).toBeNull();
			expect(mapGasOracleToTrackerShape(null)).toBeNull();
		});
	});

	describe("weiHexToGwei", () => {
		it("converts hex wei to gwei", () => {
			expect(weiHexToGwei("0x3b9aca00")).toBe(1);
		});

		it("throws on invalid input", () => {
			expect(() => weiHexToGwei("0x0")).toThrow("invalid_eth_gasPrice");
			expect(() => weiHexToGwei("not-hex")).toThrow("invalid_eth_gasPrice");
		});
	});

	describe("gasTrackerFromNetworkGwei", () => {
		it("builds low / average / high from network gwei", () => {
			const out = gasTrackerFromNetworkGwei(25.4);

			expect(out.average.gwei).toBe("26");
			expect(parseInt(out.low.gwei, 10)).toBeLessThanOrEqual(parseInt(out.average.gwei, 10));
			expect(parseInt(out.high.gwei, 10)).toBeGreaterThanOrEqual(parseInt(out.average.gwei, 10));
		});
	});
});
