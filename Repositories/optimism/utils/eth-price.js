const axios = require("axios");
const https = require("https");

const agent = new https.Agent({
	rejectUnauthorized: false,
});

/**
 * Get ETH price in USD from multiple sources with USA-optimized priority
 * @returns {Promise<string>} ETH price in USD as string
 */
const getETHPrice = async () => {
	try {
		// 1. Try CoinGecko first (most reliable for ETH, USA-accessible)
		try {
			const response = await axios.get("https://api.coingecko.com/api/v3/simple/price?ids=ethereum&vs_currencies=usd", {
				timeout: 5000,
				httpsAgent: agent,
			});

			if (response.data && response.data.ethereum && response.data.ethereum.usd) {
				return response.data.ethereum.usd.toString();
			}
		} catch (coinGeckoError) {
			console.log("CoinGecko ETH price failed:", coinGeckoError.message);
		}

		// 2. Try Binance Global (reliable ETH price, accessible from USA)
		try {
			const response = await axios.get("https://api.binance.com/api/v3/ticker/price?symbol=ETHUSDT", {
				timeout: 5000,
				httpsAgent: agent,
			});

			if (response.data && response.data.price) {
				console.log(`✅ Got ETH price from Binance Global: $${response.data.price}`);
				return response.data.price;
			}
		} catch (binanceGlobalError) {
			console.log("Binance Global ETH price failed:", binanceGlobalError.message);
		}

		// 3. Try Coinbase Pro (USA-based exchange)
		try {
			const response = await axios.get("https://api.exchange.coinbase.com/products/ETH-USD/ticker", {
				timeout: 5000,
				httpsAgent: agent,
			});

			if (response.data && response.data.price) {
				console.log(`✅ Got ETH price from Coinbase Pro: $${response.data.price}`);
				return response.data.price;
			}
		} catch (coinbaseError) {
			console.log("Coinbase Pro ETH price failed:", coinbaseError.message);
		}

		// 4. Try CoinMarketCap API
		try {
			const response = await axios.get("https://pro-api.coinmarketcap.com/v1/cryptocurrency/quotes/latest?symbol=ETH", {
				timeout: 5000,
				httpsAgent: agent,
				headers: {
					"X-CMC_PRO_API_KEY": process.env.CMC_API_KEY || "demo-key",
					Accept: "application/json",
				},
			});

			if (response.data && response.data.data && response.data.data.ETH) {
				const price = response.data.data.ETH.quote.USD.price;
				console.log(`✅ Got ETH price from CoinMarketCap: $${price}`);
				return price.toString();
			}
		} catch (cmcError) {
			console.log("CoinMarketCap ETH price failed:", cmcError.message);
		}

		// 5. Try CryptoCompare as last resort
		try {
			const response = await axios.get("https://min-api.cryptocompare.com/data/price?fsym=ETH&tsyms=USD", {
				timeout: 5000,
				httpsAgent: agent,
			});

			if (response.data && response.data.USD) {
				console.log(`✅ Got ETH price from CryptoCompare: $${response.data.USD}`);
				return response.data.USD.toString();
			}
		} catch (cryptoCompareError) {
			console.log("CryptoCompare ETH price failed:", cryptoCompareError.message);
		}

		// 6. If all sources fail, return a fallback price close to current market
		console.log("⚠️ All ETH price sources failed, using fallback price");
		return "3400"; // Approximate current ETH price
	} catch (error) {
		console.log("Error in getETHPrice:", error.message);
		return "3400"; // Fallback price
	}
};

module.exports = {
	getETHPrice,
};
