const axios = require("axios");
const moment = require("moment");
const https = require("https");
const { getTickerPrice } = require("../../binance/modules/binance.module");
const { get_ApiKey } = require("../../Solana/modules/oklink");
const StandardizedChainFormatter = require("../../class/standardized-chain-formatter");

// Initialize Base formatter
const baseFormatter = new StandardizedChainFormatter("Base", "ETH", "https://s2.coinmarketcap.com/static/img/coins/64x64/1027.png");

// Create axios instance with timeout and better error handling
const agent = new https.Agent({
	rejectUnauthorized: false,
});

const instance = axios.create({
	timeout: 10000,
	httpsAgent: agent,
});

// Generate random user agent
const generateRandomUserAgent = () => {
	const userAgents = [
		"Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36",
		"Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36",
		"Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36",
	];
	return userAgents[Math.floor(Math.random() * userAgents.length)];
};

// Base API endpoints
const BASE_RPC = "https://mainnet.base.org";
const BASE_API_BASE = "https://api.base.org";
const BASESCAN_API = "https://api.basescan.org/api";

// Helper function to get latest block number
const getLatestBlock = async () => {
	try {
		const response = await instance.post(
			BASE_RPC,
			{
				jsonrpc: "2.0",
				method: "eth_blockNumber",
				params: [],
				id: 1,
			},
			{
				headers: { "Content-Type": "application/json" },
			}
		);
		return parseInt(response.data.result, 16);
	} catch (error) {
		console.log("Failed to get latest block:", error.message);
		return 0;
	}
};

/**
 * Get comprehensive address information for Base
 * @param {Object} query - Query parameters containing address
 * @returns {Object} Address data with balance, tokens, and transactions
 */
const getAddress = async (query) => {
	try {
		const { address } = query;

		// Add overall timeout to prevent hanging
		const timeoutPromise = new Promise((_, reject) => {
			setTimeout(() => reject(new Error("Base API timeout after 8 seconds")), 8000);
		});

		const dataPromise = (async () => {
			// Get ETH balance from RPC
			let ethBalance = "0";
			try {
				const balanceResponse = await instance.post(
					BASE_RPC,
					{
						jsonrpc: "2.0",
						method: "eth_getBalance",
						params: [address, "latest"],
						id: 1,
					},
					{
						headers: { "Content-Type": "application/json" },
					}
				);
				ethBalance = balanceResponse.data.result ? (parseInt(balanceResponse.data.result, 16) / Math.pow(10, 18)).toString() : "0";
			} catch (error) {
				console.log("Base balance fetch failed:", error.message);
			}

			// Get ETH price
			let ethPrice = "0";
			try {
				const priceData = await getTickerPrice({ symbol: "ETH" });
				ethPrice = priceData.price || "0";
			} catch (error) {
				console.log("Base price fetch failed:", error.message);
			}

			// Calculate fiat balance
			const fiatBalance = parseFloat(ethBalance) * parseFloat(ethPrice);

			// Get tokens (with error handling)
			let tokens = [];
			let totalFiatBalance = 0;
			try {
				const tokensData = await getTokens({ address }, { show: "100" });
				tokens = tokensData.tokens || [];
				totalFiatBalance = tokensData.totalFiatBalance || 0;
			} catch (error) {
				console.log("Base tokens fetch failed:", error.message);
				// Continue with empty tokens array if API fails
			}

			// Add native ETH token to the beginning of tokens array (like SOL example)
			const nativeEthToken = {
				tokenType: "ETH",
				fiatBalance: fiatBalance,
				symbol: "ETH",
				name: "Ethereum",
				price: ethPrice,
				amount: parseFloat(ethBalance),
				image: "https://s2.coinmarketcap.com/static/img/coins/64x64/1027.png",
				address: address, // Native token uses the wallet address
				decimals: 18,
			};

			// Insert native token at the beginning
			tokens.unshift(nativeEthToken);

			// Get transactions with controlled timeout
			let transactions = [];
			try {
				console.log("Fetching transactions with controlled timeout...");

				// Create a timeout promise for transaction fetching
				const transactionTimeoutPromise = new Promise((_, reject) => {
					setTimeout(() => reject(new Error("Transaction fetch timeout")), 6000);
				});

				const transactionDataPromise = getTransactionsList({
					address,
					page: "0",
					show: "20",
				});

				const transactionsData = await Promise.race([transactionDataPromise, transactionTimeoutPromise]);
				transactions = transactionsData.transactions || [];
				console.log(`Found ${transactions.length} transactions via OKLink API`);
			} catch (error) {
				console.log("Transaction fetch failed:", error.message);
				// Add error message as a transaction entry
				transactions = [
					{
						hash: "0x" + "0".repeat(64),
						method: "Error",
						block: "N/A",
						age: "N/A",
						date: "N/A",
						from: address,
						traffic: "ERROR",
						to: address,
						fiatAmount: "0.00",
						amount: "0",
						asset: "ETH",
						txnFee: "0",
						note: `Transaction fetch failed: ${error.message}`,
					},
				];
			}

			// Calculate total portfolio value (ETH + all tokens)
			const totalPortfolioValue = fiatBalance + totalFiatBalance;

			// Prepare raw data for standardization
			const rawData = {
				address,
				balance: ethBalance,
				fiatBalance: fiatBalance,
				totalPortfolioValue: totalPortfolioValue,
				price: ethPrice,
				type: "system_account",
				tokenHoldings: tokens,
				transactions: transactions,
			};

			// Use standardized formatter to ensure consistent format (without wrapping)
			const formattedResponse = baseFormatter.formatAddressData(rawData, address, false);

			// Validate the response
			if (!baseFormatter.validateResponse(formattedResponse)) {
				console.warn("Base response validation failed, returning empty response");
				return baseFormatter.getEmptyResponse(address).data;
			}

			return formattedResponse;
		})();

		return await Promise.race([dataPromise, timeoutPromise]);
	} catch (error) {
		console.error("Base getAddress error:", error.message || "Unknown error");
		// Return error response in correct format (without wrapping)
		const errorResponse = baseFormatter.getErrorResponse(error.message);
		return errorResponse.data;
	}
};

/**
 * Get ERC20 tokens for a Base address
 * @param {Object} params - Parameters containing address
 * @param {Object} query - Query parameters for pagination
 * @returns {Object} Token holdings data
 */
const getTokens = async (params, query) => {
	try {
		const { address } = params;
		const t = Date.now();

		// Use OKLink API for ERC20 tokens (Base is EVM compatible)
		const url = `https://www.oklink.com/api/explorer/v2/base/addresses/${address}/tokens?offset=0&limit=${query.show || "100"}&t=${t}`;

		const { data } = await axios.get(url, {
			httpsAgent: agent,
			timeout: 5000,
			validateStatus: function (status) {
				return status < 500;
			},
			headers: {
				"X-Apikey": get_ApiKey().getApiKey(),
				"User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/132.0.0.0 Safari/537.36",
			},
		});

		if ((data.code === "0" || data.code === 0) && data.data && data.data.hits) {
			const rawTokens = data.data.hits.map((token) => ({
				address: token.contractAddress,
				symbol: token.symbol,
				name: token.tokenName,
				decimals: token.decimals || 18,
				amount: (parseFloat(token.holdingAmount) / Math.pow(10, token.decimals || 18)).toString(),
				price: token.price || "0",
				fiatBalance: (parseFloat(token.holdingAmount) * parseFloat(token.price || "0")) / Math.pow(10, token.decimals || 18),
				image: token.logo || "https://s2.coinmarketcap.com/static/img/coins/64x64/1027.png",
				tokenType: "ERC20",
				owner: address,
				contractAddress: token.contractAddress,
				rawAmount: token.holdingAmount,
			}));

			// Calculate total fiat balance across all tokens
			const totalFiatBalance = rawTokens.reduce((sum, token) => sum + (token.fiatBalance || 0), 0);

			// Use standardized formatter for token holdings
			const tokenHoldings = baseFormatter.formatTokenHoldings(rawTokens);

			return {
				balance: tokenHoldings.balance,
				total: tokenHoldings.total,
				totalFiatBalance: totalFiatBalance,
				tokens: tokenHoldings.tokens,
			};
		}

		// If OKLink fails, try to get some common Base tokens via RPC
		console.log("OKLink token API failed, trying RPC fallback for common tokens...");

		try {
			const commonTokens = await getCommonBaseTokens(address);
			if (commonTokens.length > 0) {
				console.log(`Found ${commonTokens.length} common tokens via RPC`);
				const tokenHoldings = baseFormatter.formatTokenHoldings(commonTokens);
				const totalFiatBalance = commonTokens.reduce((sum, token) => sum + (token.fiatBalance || 0), 0);

				return {
					balance: tokenHoldings.balance,
					total: tokenHoldings.total,
					totalFiatBalance: totalFiatBalance,
					tokens: tokenHoldings.tokens,
				};
			}
		} catch (fallbackError) {
			console.log("RPC fallback also failed:", fallbackError.message);
		}

		return {
			balance: "0",
			total: 0,
			tokens: [],
		};
	} catch (error) {
		console.error("Error getting Base tokens:", error.message || "Unknown error");
		return {
			balance: "0",
			total: 0,
			tokens: [],
		};
	}
};

/**
 * Get transaction list for a Base address (following Solana pattern)
 * @param {Object} query - Query parameters containing address, page, and show
 * @returns {Array} Array of transactions
 */
const getTransactionsList = async (query) => {
	try {
		const { address, page = "0", show = "100" } = query;

		// Get ETH price for transaction formatting
		let price = "3000.00000000"; // Default price
		try {
			const { getTickerPrice } = require("../../binance/modules/binance.module");
			const priceData = await getTickerPrice({ symbol: "ETH" });
			price = priceData.price || "3000.00000000";
		} catch (priceError) {
			console.log("Price fetch failed, using default:", priceError.message);
		}

		// Try OKLink API first (it might work with the right endpoint)
		let response;
		let source;

		try {
			console.log("Trying OKLink API...");
			const oklinkResponse = await getOKLinkTransactions(address, page, show, price);
			if (oklinkResponse && oklinkResponse.transactions && oklinkResponse.transactions.length > 0) {
				response = oklinkResponse;
				source = "oklink";
				console.log(`Found ${oklinkResponse.transactions.length} transactions via OKLink`);
			}
		} catch (oklinkError) {
			console.log("OKLink failed:", oklinkError.message);
		}

		// Try BaseScan API as fallback
		if (!response) {
			try {
				console.log("Trying BaseScan API...");
				const baseScanResponse = await getBaseScanTransactions(address, page, show, price);
				if (baseScanResponse && baseScanResponse.transactions && baseScanResponse.transactions.length > 0) {
					response = baseScanResponse;
					source = "basescan";
					console.log(`Found ${baseScanResponse.transactions.length} transactions via BaseScan`);
				}
			} catch (baseScanError) {
				console.log("BaseScan failed:", baseScanError.message);
			}
		}

		// Try RPC fallback for transaction count
		if (!response) {
			try {
				console.log("Trying RPC fallback...");
				const rpcResponse = await getRPCTransactionCount(address, price);
				if (rpcResponse) {
					response = rpcResponse;
					source = "rpc";
					console.log("Using RPC transaction count fallback");
				}
			} catch (rpcError) {
				console.log("RPC fallback failed:", rpcError.message);
			}
		}

		// Add source to response if response exists
		if (response) {
			response.source = source;
			return response;
		}

		// If no transactions found from external APIs, return empty result
		console.log("No transactions found from external APIs");
		return { pagination: { records: "0", pages: "0", page: "0" }, transactions: [] };
	} catch (error) {
		console.error("Error getting Base transactions:", error.message || "Unknown error");
		return { pagination: { records: "0", pages: "0", page: "0" }, transactions: [] };
	}
};

/**
 * Get transaction status/details for a Base transaction
 * @param {Object} params - Parameters containing transaction ID
 * @returns {Object} Transaction details
 */
const getTransactionStatus = async (params) => {
	try {
		const { id } = params;

		// First try OKLink API
		const t = Date.now();
		const url = `https://www.oklink.com/api/explorer/v1/base/transactions/${id}?t=${t}`;

		const { data } = await axios.get(url, {
			httpsAgent: agent,
			timeout: 10000,
			validateStatus: function (status) {
				return status < 500; // Resolve only if status is less than 500
			},
			headers: {
				"X-Apikey": get_ApiKey().getApiKey(),
				"User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/132.0.0.0 Safari/537.36",
			},
		});

		if (data.code === "0" && data.data) {
			const tx = data.data;
			return {
				blockNumber: tx.blockHeight,
				confirmations: tx.confirmations || 0,
				from: tx.from,
				gas: tx.gasUsed,
				gasPrice: tx.gasPrice,
				hash: tx.hash,
				input: tx.input || "0x",
				nonce: tx.nonce,
				to: tx.to,
				transactionIndex: tx.transactionIndex,
				value: (parseFloat(tx.value) / Math.pow(10, 18)).toFixed(6),
				status: tx.status === "1" ? "success" : "failed",
				timestamp: tx.blocktime,
				fee: tx.fee,
			};
		}

		// Fallback to BaseScan scraping
		try {
			const response = await instance.get(`https://basescan.org/tx/${id}`, {
				headers: { "user-agent": generateRandomUserAgent() },
				timeout: 10000,
			});

			// Parse the HTML response to extract transaction details
			// This is a simplified version - in a real implementation, you'd use a proper HTML parser
			const html = response.data;

			// Extract basic information from the page
			const blockMatch = html.match(/Block\s*(\d+)/i);
			const fromMatch = html.match(/From:\s*([a-zA-Z0-9]{42})/i);
			const toMatch = html.match(/To:\s*([a-zA-Z0-9]{42})/i);
			const valueMatch = html.match(/Value:\s*([\d.]+)\s*ETH/i);

			return {
				blockNumber: blockMatch ? blockMatch[1] : "N/A",
				confirmations: 1, // Assume confirmed if we can access the page
				from: fromMatch ? fromMatch[1] : "N/A",
				to: toMatch ? toMatch[1] : "N/A",
				value: valueMatch ? valueMatch[1] : "0",
				status: "success", // Assume success if we can access the page
				hash: id,
			};
		} catch (scrapeError) {
			console.log("BaseScan scraping failed:", scrapeError.message);
		}

		// Final fallback: RPC call
		try {
			const response = await instance.post(
				BASE_RPC,
				{
					jsonrpc: "2.0",
					method: "eth_getTransactionByHash",
					params: [id],
					id: 1,
				},
				{
					headers: { "Content-Type": "application/json" },
				}
			);

			if (response.data.result) {
				const tx = response.data.result;
				return {
					blockNumber: tx.blockNumber ? parseInt(tx.blockNumber, 16) : "N/A",
					from: tx.from,
					to: tx.to,
					value: tx.value ? (parseInt(tx.value, 16) / Math.pow(10, 18)).toFixed(6) : "0",
					gas: tx.gas ? parseInt(tx.gas, 16) : "0",
					gasPrice: tx.gasPrice ? parseInt(tx.gasPrice, 16) : "0",
					nonce: tx.nonce ? parseInt(tx.nonce, 16) : "0",
					input: tx.input || "0x",
					hash: tx.hash,
					status: tx.blockNumber ? "success" : "pending",
				};
			}
		} catch (rpcError) {
			console.log("Base RPC transaction fetch failed:", rpcError.message);
		}

		return { error: "Transaction not found" };
	} catch (error) {
		console.error("Error getting Base transaction status:", error.message || "Unknown error");
		return { error: "Failed to fetch transaction status" };
	}
};

/**
 * Get portfolio summary for a Base address (like OKLink dashboard)
 * @param {Object} params - Parameters containing address
 * @returns {Object} Portfolio summary data
 */
const getPortfolioSummary = async (params) => {
	try {
		const { address } = params;

		// Get ETH balance and price
		let ethBalance = "0";
		let ethPrice = "0";
		try {
			const balanceResponse = await instance.post(
				BASE_RPC,
				{
					jsonrpc: "2.0",
					method: "eth_getBalance",
					params: [address, "latest"],
					id: 1,
				},
				{
					headers: { "Content-Type": "application/json" },
				}
			);
			ethBalance = balanceResponse.data.result ? (parseInt(balanceResponse.data.result, 16) / Math.pow(10, 18)).toString() : "0";

			const priceData = await getTickerPrice({ symbol: "ETH" });
			ethPrice = priceData.price || "0";
		} catch (error) {
			console.log("Portfolio summary ETH data fetch failed:", error.message);
		}

		// Get all tokens
		const tokensData = await getTokens({ address }, { show: "100" });
		const tokens = tokensData.tokens || [];
		const totalTokenValue = tokensData.totalFiatBalance || 0;

		// Calculate total portfolio value
		const ethValue = parseFloat(ethBalance) * parseFloat(ethPrice);
		const totalPortfolioValue = ethValue + totalTokenValue;

		// Get transaction count
		let transactionCount = 0;
		try {
			const nonceResponse = await instance.post(
				BASE_RPC,
				{
					jsonrpc: "2.0",
					method: "eth_getTransactionCount",
					params: [address, "latest"],
					id: 1,
				},
				{
					headers: { "Content-Type": "application/json" },
				}
			);
			transactionCount = nonceResponse.data.result ? parseInt(nonceResponse.data.result, 16) : 0;
		} catch (error) {
			console.log("Transaction count fetch failed:", error.message);
		}

		return {
			address,
			totalPortfolioValue: totalPortfolioValue.toFixed(2),
			ethBalance: parseFloat(ethBalance).toFixed(8),
			ethValue: ethValue.toFixed(2),
			ethPrice: ethPrice,
			tokenCount: tokens.length,
			totalTokenValue: totalTokenValue.toFixed(2),
			transactionCount: transactionCount,
			tokens: tokens,
			lastUpdated: new Date().toISOString(),
		};
	} catch (error) {
		console.error("Error getting Base portfolio summary:", error.message || "Unknown error");
		return { error: "Failed to fetch portfolio summary" };
	}
};

/**
 * Get BaseScan transactions (like Solscan in Solana)
 * @param {string} address - Address to get transactions for
 * @param {string} page - Page number
 * @param {string} show - Number of transactions to show
 * @param {string} price - ETH price
 * @returns {Object} Transaction data
 */
const getBaseScanTransactions = async (address, page, show, price) => {
	try {
		// Try BaseScan API without API key (public endpoint)
		const url = `https://api.basescan.org/api?module=account&action=txlist&address=${address}&startblock=0&endblock=99999999&page=${page}&offset=${show}&sort=desc`;

		const { data } = await axios.get(url, {
			timeout: 10000,
			validateStatus: function (status) {
				return status < 500;
			},
			headers: {
				"User-Agent": generateRandomUserAgent(),
				Accept: "application/json",
			},
		});

		if (data.status === "1" && data.result && data.result.length > 0) {
			const rawTransactions = data.result.map((tx) => {
				const value = parseFloat(tx.value) / Math.pow(10, 18);
				const fiatValue = value * parseFloat(price);
				const traffic = tx.from.toLowerCase() === address.toLowerCase() ? "OUT" : "IN";

				return {
					hash: tx.hash,
					block: tx.blockNumber,
					from: tx.from,
					to: tx.to,
					value: value.toString(),
					fiatValue: fiatValue.toFixed(2),
					gas: tx.gasUsed || "0",
					gasPrice: tx.gasPrice || "0",
					nonce: tx.nonce || "0",
					input: tx.input || "0x",
					blocktime: parseInt(tx.timeStamp),
					traffic: traffic,
					method: tx.methodId ? "Contract Interaction" : "ETH transfer",
					status: tx.isError === "0" ? "Success" : "Failed",
					image: "https://s2.coinmarketcap.com/static/img/coins/64x64/1027.png",
					date: moment(parseInt(tx.timeStamp) * 1000).format("YYYY-MM-DD HH:mm:ss"),
					age: moment(parseInt(tx.timeStamp) * 1000).fromNow(),
					txnFee: tx.gasUsed && tx.gasPrice ? ((parseFloat(tx.gasUsed) * parseFloat(tx.gasPrice)) / Math.pow(10, 18)).toFixed(8) : "0",
					confirmations: "1",
				};
			});

			// Use standardized formatter for transactions
			const transactions = baseFormatter.formatTransactions(rawTransactions);

			return {
				pagination: { records: transactions.length.toString(), pages: "1", page: page },
				transactions: transactions,
			};
		}

		return null;
	} catch (error) {
		console.log("BaseScan transactions failed:", error.message);
		return null;
	}
};

/**
 * Get OKLink transactions for Base (using the working endpoint)
 * @param {string} address - Address to get transactions for
 * @param {string} page - Page number
 * @param {string} show - Number of transactions to show
 * @param {string} price - ETH price
 * @returns {Object} Transaction data
 */
const getOKLinkTransactions = async (address, page, show, price) => {
	try {
		const t = Date.now();

		// Use the OKLink endpoint that actually works (returns 200 status)
		const url = `https://www.oklink.com/api/explorer/v2/base/addresses/${address}/transactionsByClassfy/condition?offset=${page}&limit=${show}&address=${address}&nonzeroValue=false&t=${t}`;

		const { data } = await axios.get(url, {
			httpsAgent: agent,
			timeout: 10000,
			validateStatus: function (status) {
				return status < 500;
			},
			headers: {
				"X-Apikey": get_ApiKey().getApiKey(),
				"User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/132.0.0.0 Safari/537.36",
			},
		});

		// Check if we got a successful response
		if ((data.code === "0" || data.code === 0) && data.data && data.data.hits) {
			console.log(`✅ OKLink API success! Found ${data.data.hits.length} transactions out of ${data.data.total} total`);

			const rawTransactions = data.data.hits.map((tx) => {
				const value = parseFloat(tx.value);
				const fiatValue = value * parseFloat(price);
				const traffic = tx.from.toLowerCase() === address.toLowerCase() ? "OUT" : "IN";

				return {
					hash: tx.hash,
					block: tx.blockHeight.toString(),
					from: tx.from,
					to: tx.to,
					value: value.toString(),
					fiatValue: fiatValue.toFixed(2),
					gas: "0", // OKLink doesn't provide gas info in this endpoint
					gasPrice: "0",
					nonce: "0",
					input: "0x",
					blocktime: tx.blocktime,
					timestamp: tx.blocktime, // Add timestamp field for formatter
					traffic: traffic,
					method: tx.method || "ETH transfer",
					status: tx.status === "0x1" ? "Success" : "Failed",
					image: "https://s2.coinmarketcap.com/static/img/coins/64x64/1027.png",
					age: tx.blocktime ? moment(tx.blocktime * 1000).fromNow() : "N/A",
					txnFee: tx.fee ? parseFloat(tx.fee).toFixed(8) : "0",
					confirmations: "1",
				};
			});

			// Return raw transactions (will be formatted by getAddress)
			return {
				pagination: {
					records: data.data.total.toString(),
					pages: Math.ceil(data.data.total / parseInt(show)).toString(),
					page: page,
				},
				transactions: rawTransactions,
			};
		} else if (data.code === "5005") {
			// API_DECODE_ERROR - this might mean the endpoint exists but has issues
			console.log("OKLink API returned decode error - endpoint exists but may have issues");
			return null;
		} else {
			// Only log as error if there's actually an error message
			if (data.msg || data.message) {
				console.log(`OKLink API error: ${data.msg || data.message}`);
			} else {
				console.log(`OKLink API returned code ${data.code} with no error message`);
			}
			return null;
		}
	} catch (error) {
		console.log("OKLink transactions failed:", error.message);
		return null;
	}
};

/**
 * Get RPC transaction count fallback (when APIs fail)
 * @param {string} address - Address to get transaction count for
 * @param {string} price - ETH price
 * @returns {Object} Transaction data with count info
 */
const getRPCTransactionCount = async (address, price) => {
	try {
		// Get transaction count from RPC
		const nonceResponse = await instance.post(
			BASE_RPC,
			{
				jsonrpc: "2.0",
				method: "eth_getTransactionCount",
				params: [address, "latest"],
				id: 1,
			},
			{
				headers: { "Content-Type": "application/json" },
			}
		);

		const txCount = nonceResponse.data.result ? parseInt(nonceResponse.data.result, 16) : 0;

		// Create a placeholder transaction showing the count
		const placeholderTransaction = {
			age: moment().fromNow(),
			amount: "0",
			assetPrice: price.toString(),
			block: "N/A",
			confirmations: "0",
			date: "N/A",
			from: address,
			gasPrice: "0",
			hash: "0x0000000000000000000000000000000000000000000000000000000000000000",
			image: "https://s2.coinmarketcap.com/static/img/coins/64x64/1027.png", // ETH logo
			status: "Info",
			to: address,
			txnFee: "0",
			type: "info",
			note: `This address has ${txCount} outgoing transactions. BaseScan API is the primary source for Base transactions.`,
		};

		return {
			pagination: { records: "1", pages: "1", page: "0" },
			transactions: [placeholderTransaction],
		};
	} catch (error) {
		console.log("RPC transaction count failed:", error.message);
		return null;
	}
};

/**
 * Get common Base tokens via RPC (fallback when OKLink fails)
 * @param {string} address - Address to check for tokens
 * @returns {Array} Array of common token data
 */
const getCommonBaseTokens = async (address) => {
	try {
		// Top 30 Common Base tokens with their contract addresses
		const commonTokens = [
			// Stablecoins
			{
				name: "USDC",
				symbol: "USDC",
				contractAddress: "0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913",
				decimals: 6,
				image: "https://s2.coinmarketcap.com/static/img/coins/64x64/3408.png",
			},
			{
				name: "USDT",
				symbol: "USDT",
				contractAddress: "0x50c5725949A6F0c72E6C4a641F24049A917DB0Cb",
				decimals: 6,
				image: "https://s2.coinmarketcap.com/static/img/coins/64x64/825.png",
			},
			{
				name: "DAI",
				symbol: "DAI",
				contractAddress: "0x50c5725949A6F0c72E6C4a641F24049A917DB0Cb",
				decimals: 18,
				image: "https://s2.coinmarketcap.com/static/img/coins/64x64/4943.png",
			},
			// Wrapped Assets
			{
				name: "cbETH",
				symbol: "cbETH",
				contractAddress: "0x2Ae3F1Ec7F1F5012CFEab0185BfC7aa3CF0DEC22",
				decimals: 18,
				image: "https://s2.coinmarketcap.com/static/img/coins/64x64/1027.png",
			},
			{
				name: "cbBTC",
				symbol: "cbBTC",
				contractAddress: "0x236aa50979D5f3De3Bd1Eeb40E81137F22ab794b",
				decimals: 8,
				image: "https://s2.coinmarketcap.com/static/img/coins/64x64/1.png",
			},
			// DeFi Tokens
			{
				name: "Aerodrome",
				symbol: "AERO",
				contractAddress: "0x940181a94A35A4569E4529A3CDfB74e38FD98631",
				decimals: 18,
				image: "https://s2.coinmarketcap.com/static/img/coins/64x64/28744.png",
			},
			{
				name: "TOSHI",
				symbol: "TOSHI",
				contractAddress: "0xF4d2888d29D722226FafA5d9B24F9164c09242E4",
				decimals: 18,
				image: "https://s2.coinmarketcap.com/static/img/coins/64x64/28744.png",
			},
			{
				name: "BALD",
				symbol: "BALD",
				contractAddress: "0x27D2DECb4bFC9C76F0309b8E88dec3a601Fe25a8",
				decimals: 18,
				image: "https://s2.coinmarketcap.com/static/img/coins/64x64/28744.png",
			},
			{
				name: "Meme",
				symbol: "MEME",
				contractAddress: "0xB33EaAd8d922B1083446DC23f610c2567fB5180f",
				decimals: 18,
				image: "https://s2.coinmarketcap.com/static/img/coins/64x64/28744.png",
			},
			{
				name: "DEGEN",
				symbol: "DEGEN",
				contractAddress: "0x4ed4E862860beD51a9570b96d89aF5E1B0Efefed",
				decimals: 18,
				image: "https://s2.coinmarketcap.com/static/img/coins/64x64/28744.png",
			},
			// L2 Tokens
			{
				name: "Optimism",
				symbol: "OP",
				contractAddress: "0x4200000000000000000000000000000000000042",
				decimals: 18,
				image: "https://s2.coinmarketcap.com/static/img/coins/64x64/11840.png",
			},
			// Gaming & Metaverse
			{
				name: "ZORA",
				symbol: "ZORA",
				contractAddress: "0x3ab6Ed69Ef663bd986Ee59205EaD8B25F2998a32",
				decimals: 18,
				image: "https://s2.coinmarketcap.com/static/img/coins/64x64/28744.png",
			},
			{
				name: "Friend.tech",
				symbol: "FRIEND",
				contractAddress: "0xCF205808Ed36593aa40a44F10c7f7C2F67d4A4d4",
				decimals: 18,
				image: "https://s2.coinmarketcap.com/static/img/coins/64x64/28744.png",
			},
			// Infrastructure
			{
				name: "Chainlink",
				symbol: "LINK",
				contractAddress: "0x88DfaAABaf06f3a41D2606EA98BC8A109A5a0a02",
				decimals: 18,
				image: "https://s2.coinmarketcap.com/static/img/coins/64x64/1975.png",
			},
			{
				name: "Uniswap",
				symbol: "UNI",
				contractAddress: "0x6fd9d7AD17242c41f7131d257212c54A0e816691",
				decimals: 18,
				image: "https://s2.coinmarketcap.com/static/img/coins/64x64/7083.png",
			},
			// Meme Coins
			{
				name: "Pepe",
				symbol: "PEPE",
				contractAddress: "0x6982508145454Ce325dDbE47a25d4ec3d2311933",
				decimals: 18,
				image: "https://s2.coinmarketcap.com/static/img/coins/64x64/24478.png",
			},
			{
				name: "Shiba Inu",
				symbol: "SHIB",
				contractAddress: "0x981Fd6562d2c4c65fD6Cfc250ab9B4C2Db43Dc5D",
				decimals: 18,
				image: "https://s2.coinmarketcap.com/static/img/coins/64x64/5994.png",
			},
			{
				name: "Dogecoin",
				symbol: "DOGE",
				contractAddress: "0x3832d2F059E55934220881F831bE501D180671A7",
				decimals: 8,
				image: "https://s2.coinmarketcap.com/static/img/coins/64x64/74.png",
			},
			// Yield & Staking
			{
				name: "Rocket Pool ETH",
				symbol: "rETH",
				contractAddress: "0x178E141a0E3b34152f73Ff610437A7bf9B83267A",
				decimals: 18,
				image: "https://s2.coinmarketcap.com/static/img/coins/64x64/15060.png",
			},
			{
				name: "Lido Staked ETH",
				symbol: "stETH",
				contractAddress: "0x1F32b1c2345538c0c6f582fCB022739c4A194Ebb",
				decimals: 18,
				image: "https://s2.coinmarketcap.com/static/img/coins/64x64/15060.png",
			},
			// DeFi Protocols
			{
				name: "Compound",
				symbol: "COMP",
				contractAddress: "0x9e1028F5F1D5eDE59748FFcE553474997D6ECA76",
				decimals: 18,
				image: "https://s2.coinmarketcap.com/static/img/coins/64x64/5692.png",
			},
			{
				name: "Aave",
				symbol: "AAVE",
				contractAddress: "0x4B8C80D5A0F5eDc5aC26D97E282eD9C8cF0E4b7a",
				decimals: 18,
				image: "https://s2.coinmarketcap.com/static/img/coins/64x64/7278.png",
			},
			// Layer 1 Tokens
			{
				name: "Polygon",
				symbol: "MATIC",
				contractAddress: "0x4200000000000000000000000000000000000006",
				decimals: 18,
				image: "https://s2.coinmarketcap.com/static/img/coins/64x64/3890.png",
			},
			{
				name: "Arbitrum",
				symbol: "ARB",
				contractAddress: "0x912CE59144191C1204E64559FE8253a0e49E6548",
				decimals: 18,
				image: "https://s2.coinmarketcap.com/static/img/coins/64x64/11841.png",
			},
			// Exchange Tokens
			{
				name: "Binance Coin",
				symbol: "BNB",
				contractAddress: "0x4200000000000000000000000000000000000006",
				decimals: 18,
				image: "https://s2.coinmarketcap.com/static/img/coins/64x64/1839.png",
			},
			// Privacy & Security
			{
				name: "Tornado Cash",
				symbol: "TORN",
				contractAddress: "0x722E8BdD2ce80A4422E880164f2079488e115365",
				decimals: 18,
				image: "https://s2.coinmarketcap.com/static/img/coins/64x64/8049.png",
			},
			// AI & Data
			{
				name: "The Graph",
				symbol: "GRT",
				contractAddress: "0x23A941036Ae778Ac51Ab04CEa08Ed6e2FE103614",
				decimals: 18,
				image: "https://s2.coinmarketcap.com/static/img/coins/64x64/6719.png",
			},
			// Oracle & Data
			{
				name: "Band Protocol",
				symbol: "BAND",
				contractAddress: "0x86E53CF1B870786351Da77A57575e79CB55812CB",
				decimals: 18,
				image: "https://s2.coinmarketcap.com/static/img/coins/64x64/4066.png",
			},
			// Governance
			{
				name: "Maker",
				symbol: "MKR",
				contractAddress: "0xab7bAdEF82E9Fe11f6f33f87BC9bC2AA27F2fCB5",
				decimals: 18,
				image: "https://s2.coinmarketcap.com/static/img/coins/64x64/1518.png",
			},
			// Cross-chain
			{
				name: "Multichain",
				symbol: "MULTI",
				contractAddress: "0x9Fb9a33956351cA4D4D4E6C3C4B0B3e2e3e2e1d0",
				decimals: 18,
				image: "https://s2.coinmarketcap.com/static/img/coins/64x64/28744.png",
			},
		];

		const tokens = [];

		for (const token of commonTokens) {
			try {
				// Get token balance using ERC20 balanceOf function
				const balanceResponse = await instance.post(
					BASE_RPC,
					{
						jsonrpc: "2.0",
						method: "eth_call",
						params: [
							{
								to: token.contractAddress,
								data: "0x70a08231" + "000000000000000000000000" + address.slice(2), // balanceOf(address)
							},
							"latest",
						],
						id: 1,
					},
					{
						headers: { "Content-Type": "application/json" },
					}
				);

				if (balanceResponse.data.result && balanceResponse.data.result !== "0x") {
					const balance = parseInt(balanceResponse.data.result, 16);
					if (balance > 0) {
						const amount = balance / Math.pow(10, token.decimals);

						// Get token price from Binance API with symbol mapping
						let price = "0.00";
						try {
							// Map symbols to Binance-compatible format
							let binanceSymbol = token.symbol;

							// Handle special cases
							if (token.symbol === "USDT" || token.symbol === "USDC" || token.symbol === "DAI") {
								price = "1.00"; // Stablecoins are always $1
								continue; // Skip the API call
							} else if (token.symbol === "cbETH") {
								binanceSymbol = "ETH"; // Use ETH price for cbETH
							} else if (token.symbol === "rETH" || token.symbol === "stETH") {
								binanceSymbol = "ETH"; // Use ETH price for staking derivatives
							} else if (token.symbol === "TORN") {
								binanceSymbol = "ETH"; // Use ETH price as fallback for TORN
							}

							const priceData = await getTickerPrice({ symbol: binanceSymbol });
							price = priceData.price || "0.00";
						} catch (priceError) {
							// If price fetch fails, set to 0
							price = "0.00";
						}

						const fiatBalance = amount * parseFloat(price);

						tokens.push({
							address: token.contractAddress,
							symbol: token.symbol,
							name: token.name,
							decimals: token.decimals,
							amount: amount.toString(),
							price: price,
							fiatBalance: fiatBalance,
							image: token.image,
							tokenType: "ERC20",
							owner: address,
							contractAddress: token.contractAddress,
							rawAmount: balance.toString(),
						});
					}
				}
			} catch (tokenError) {
				// Continue with next token if one fails
				continue;
			}
		}

		return tokens;
	} catch (error) {
		console.log("Error getting common Base tokens:", error.message);
		return [];
	}
};

/**
 * Get gas tracker information for Base
 * @param {Object} query - Query parameters
 * @returns {Object} Gas tracker data
 */
const getGasTracker = async (query) => {
	try {
		// Try BaseScan gas tracker API
		const url = `https://api.basescan.org/api?module=gastracker&action=gasoracle&apikey=YourApiKeyToken`;

		const { data } = await axios.get(url, {
			timeout: 10000,
			validateStatus: function (status) {
				return status < 500;
			},
		});

		if (data.status === "1" && data.result) {
			return {
				SafeLow: data.result.SafeLow,
				Standard: data.result.Standard,
				Fast: data.result.Fast,
				Fastest: data.result.Fastest,
				safeLowWait: data.result.safeLowWait,
				standardWait: data.result.standardWait,
				fastWait: data.result.fastWait,
				fastestWait: data.result.fastestWait,
			};
		}

		// Fallback: Estimate gas prices from recent blocks
		try {
			const response = await instance.post(
				BASE_RPC,
				{
					jsonrpc: "2.0",
					method: "eth_gasPrice",
					params: [],
					id: 1,
				},
				{
					headers: { "Content-Type": "application/json" },
				}
			);

			const gasPrice = response.data.result ? parseInt(response.data.result, 16) / Math.pow(10, 9) : 0;

			return {
				SafeLow: Math.floor(gasPrice * 0.8),
				Standard: Math.floor(gasPrice),
				Fast: Math.floor(gasPrice * 1.2),
				Fastest: Math.floor(gasPrice * 1.5),
				safeLowWait: "1-2",
				standardWait: "1",
				fastWait: "1",
				fastestWait: "1",
			};
		} catch (rpcError) {
			console.log("Base RPC gas price fetch failed:", rpcError.message);
		}

		return { error: "Gas tracker data not available" };
	} catch (error) {
		console.error("Error getting Base gas tracker:", error.message || "Unknown error");
		return { error: "Failed to fetch gas tracker data" };
	}
};

module.exports = {
	getAddress,
	getTokens,
	getTransactionsList,
	getTransactionStatus,
	getGasTracker,
	getPortfolioSummary,
	getLatestBlock,
};
