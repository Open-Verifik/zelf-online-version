const { getTickerPrice } = require("../../binance/modules/binance.module");

/**
 * Get token price with special handling for stablecoins and symbol mapping
 * @param {string} symbol - Token symbol
 * @returns {string} Price as string
 */
const getTokenPrice = async (symbol) => {
	try {
		// Handle stablecoins - always $1
		if (symbol === "USDT" || symbol === "USDC" || symbol === "DAI" || symbol === "FRAX") {
			return "1.00";
		}

		// Map symbols to Binance-compatible format
		let binanceSymbol = symbol;

		if (symbol === "WETH") {
			binanceSymbol = "ETH"; // Use ETH price for WETH
		} else if (symbol === "ARB") {
			binanceSymbol = "ARB"; // Arbitrum token
		} else if (symbol === "GMX") {
			binanceSymbol = "GMX"; // GMX token
		} else if (symbol === "MAGIC") {
			binanceSymbol = "MAGIC"; // Magic token
		} else if (symbol === "LINK") {
			binanceSymbol = "LINK"; // Chainlink
		} else if (symbol === "UNI") {
			binanceSymbol = "UNI"; // Uniswap
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
