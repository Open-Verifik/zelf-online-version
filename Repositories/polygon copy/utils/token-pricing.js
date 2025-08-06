const { getTickerPrice } = require("../../binance/modules/binance.module");

/**
 * Get token price with special handling for stablecoins and symbol mapping
 * @param {string} symbol - Token symbol
 * @returns {string} Price as string
 */
const getTokenPrice = async (symbol) => {
	try {
		// Handle stablecoins - always $1
		if (symbol === "USDT" || symbol === "USDC" || symbol === "DAI") {
			return "1.00";
		}

		// Map symbols to Binance-compatible format
		let binanceSymbol = symbol;

		if (symbol === "WMATIC") {
			binanceSymbol = "MATIC"; // Use MATIC price for WMATIC
		} else if (symbol === "WETH") {
			binanceSymbol = "ETH"; // Use ETH price for WETH
		} else if (symbol === "stMATIC") {
			binanceSymbol = "MATIC"; // Use MATIC price for staking derivatives
		} else if (symbol === "QUICK") {
			binanceSymbol = "QUICK"; // QuickSwap token
		}

		// Get price from Binance API
		const priceData = await getTickerPrice({ symbol: binanceSymbol });
		return priceData.price || "0.00";
	} catch (error) {
		// If price fetch fails, return 0
		return "0.00";
	}
};

module.exports = {
	getTokenPrice,
};
