/**
 * Pure helpers for Ethereum gas tracker (Etherscan gas oracle + RPC shaping).
 * Kept separate for unit tests without HTTP mocks.
 */

const mapGasOracleToTrackerShape = (result) => {
	if (!result || result.ProposeGasPrice == null) return null;

	const baseFeeStr = result.suggestBaseFee != null ? String(result.suggestBaseFee) : "0";
	const safe = String(result.SafeGasPrice ?? "");
	const propose = String(result.ProposeGasPrice ?? "");
	const fast = String(result.FastGasPrice ?? "");

	const priorityFrom = (gweiStr) => {
		const g = parseFloat(gweiStr);
		const b = parseFloat(baseFeeStr);
		if (Number.isNaN(g)) return "0";
		if (Number.isNaN(b)) return gweiStr;
		return Math.max(0, g - b).toFixed(2).replace(/\.?0+$/, "") || "0";
	};

	return {
		low: {
			gwei: safe,
			base: baseFeeStr,
			priority: priorityFrom(safe),
			cost: "$0.00",
			time: "~ 5 min",
		},
		average: {
			gwei: propose,
			base: baseFeeStr,
			priority: priorityFrom(propose),
			cost: "$0.00",
			time: "~ 1 min",
		},
		high: {
			gwei: fast,
			base: baseFeeStr,
			priority: priorityFrom(fast),
			cost: "$0.00",
			time: "~ 30 sec",
		},
		featuredActions: [],
	};
};

/**
 * @param {string|number} weiHexOrDec - JSON-RPC eth_gasPrice result (e.g. "0x3b9aca00")
 * @returns {number} gwei as float
 */
const weiHexToGwei = (weiHexOrDec) => {
	const wei =
		typeof weiHexOrDec === "string" && weiHexOrDec.startsWith("0x")
			? parseInt(weiHexOrDec, 16)
			: Number(weiHexOrDec);
	if (!Number.isFinite(wei) || wei <= 0) {
		throw new Error("invalid_eth_gasPrice");
	}
	return wei / 1e9;
};

/**
 * @param {string} weiHex - JSON-RPC eth_getBalance result (e.g. "0x...")
 * @returns {number} ETH balance as float
 */
const weiHexToEth = (weiHex) => {
	if (typeof weiHex !== "string" || !weiHex.startsWith("0x")) {
		throw new Error("invalid_eth_getBalance");
	}
	const wei = BigInt(weiHex);
	const denom = 10n ** 18n;
	const whole = wei / denom;
	const frac = wei % denom;
	return Number(whole) + Number(frac) / 1e18;
};

/**
 * Build legacy tracker shape from network suggested gas price (gwei).
 * @param {number} gwei - effective gas price in gwei
 */
const gasTrackerFromNetworkGwei = (gwei) => {
	const averageGwei = Math.max(1, Math.ceil(gwei));
	const lowGwei = Math.max(1, Math.floor(averageGwei * 0.8));
	const highGwei = Math.max(lowGwei, Math.ceil(averageGwei * 1.2));
	const baseFeeStr = "0";

	return {
		low: {
			gwei: String(lowGwei),
			base: baseFeeStr,
			priority: String(lowGwei),
			cost: "$0.00",
			time: "~ 5 min",
		},
		average: {
			gwei: String(averageGwei),
			base: baseFeeStr,
			priority: String(averageGwei),
			cost: "$0.00",
			time: "~ 1 min",
		},
		high: {
			gwei: String(highGwei),
			base: baseFeeStr,
			priority: String(highGwei),
			cost: "$0.00",
			time: "~ 30 sec",
		},
		featuredActions: [],
	};
};

module.exports = {
	mapGasOracleToTrackerShape,
	weiHexToGwei,
	weiHexToEth,
	gasTrackerFromNetworkGwei,
};
