const axios = require("axios");
const moment = require("moment");
const https = require("https");
const { getTickerPrice } = require("../../binance/modules/binance.module");

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

// BlockDAG RPC endpoint from the image
const BLOCKDAG_RPC = "http://13.234.176.105:18545";
const BLOCKDAG_TESTNET_RPC = "https://testnet-rpc.blockdag.network";
const BLOCKDAG_EXPLORER = "https://primordial.bdagscan.com";

// Helper function to get latest block number
const getLatestBlock = async () => {
	try {
		const response = await instance.post(
			BLOCKDAG_RPC,
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
		console.error("BlockDAG getLatestBlock error:", error.message);
		return 0;
	}
};

/**
 * Get comprehensive address information for BlockDAG
 * @param {Object} query - Query parameters containing address
 * @returns {Object} Address data with balance, tokens, and transactions
 */
const getAddress = async (query) => {
	try {
		const { address } = query;

		// Add overall timeout to prevent hanging
		const timeoutPromise = new Promise((_, reject) => {
			setTimeout(() => reject(new Error("BlockDAG API timeout after 8 seconds")), 8000);
		});

		const dataPromise = (async () => {
			// Get BDAG balance from RPC
			let bdagBalance = "0";
			try {
				const balanceResponse = await instance.post(
					BLOCKDAG_RPC,
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
				bdagBalance = balanceResponse.data.result ? (parseInt(balanceResponse.data.result, 16) / Math.pow(10, 18)).toString() : "0";
			} catch (error) {
				console.error("BlockDAG balance fetch failed:", error.message);
			}

			// Get BDAG price (using placeholder for now, adjust when BDAG is on exchanges)
			let bdagPrice = "0";
			try {
				// Try to get BDAG price from Binance
				const priceData = await getTickerPrice({ symbol: "BDAG" });

				bdagPrice = priceData.price || "0";
			} catch (error) {
				console.log("BlockDAG price fetch failed, using default:", error.message);
				// Use a default price if BDAG is not yet listed
				bdagPrice = "0.001"; // Placeholder price
			}

			// Calculate fiat balance
			const fiatBalance = parseFloat(bdagBalance) * parseFloat(bdagPrice);

			// Get tokens (with error handling)
			let tokens = [];
			let totalFiatBalance = 0;
			try {
				const tokensData = await getTokens({ address }, { show: "100" });
				tokens = tokensData.tokens || [];
				totalFiatBalance = tokensData.totalFiatBalance || 0;
			} catch (error) {
				console.error("BlockDAG tokens fetch failed:", error.message);
				// Continue with empty tokens array if API fails
			}

			// Add native BDAG token to the beginning of tokens array
			const nativeBdagToken = {
				tokenType: "BDAG",
				fiatBalance: fiatBalance,
				symbol: "BDAG",
				name: "BlockDAG",
				price: bdagPrice,
				amount: bdagBalance,
				image: "https://cryptologos.cc/logos/blockdag-bdag-logo.png", // Placeholder image
				address: address, // Native token uses the wallet address
				decimals: 18,
			};

			// Insert native token at the beginning
			tokens.unshift(nativeBdagToken);

			// Get transactions with controlled timeout
			let transactions = [];
			try {
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
			} catch (error) {
				console.error("Transaction fetch failed:", error.message);
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
						asset: "BDAG",
						txnFee: "0",
						note: `Transaction fetch failed: ${error.message}`,
					},
				];
			}

			// Calculate total portfolio value (BDAG + all tokens)
			const totalPortfolioValue = fiatBalance + totalFiatBalance;

			// Prepare response
			const response = {
				address,
				balance: bdagBalance,
				fiatBalance: fiatBalance,
				totalPortfolioValue: totalPortfolioValue,
				price: bdagPrice,
				type: "system_account",
				account: {
					asset: "BDAG",
					fiatBalance: fiatBalance.toString(),
					price: bdagPrice,
				},
				tokenHoldings: {
					total: tokens.length,
					balance: (fiatBalance + totalFiatBalance).toString(),
					tokens,
				},
				transactions,
			};

			return response;
		})();

		return await Promise.race([dataPromise, timeoutPromise]);
	} catch (error) {
		console.error("BlockDAG getAddress error:", error.message || "Unknown error");
		return {
			error: "Failed to fetch address data",
			message: error.message,
		};
	}
};

/**
 * Get ERC20 tokens for a BlockDAG address
 * @param {Object} params - Parameters containing address
 * @param {Object} query - Query parameters for pagination
 * @returns {Object} Token holdings data
 */
const getTokens = async (params, query) => {
	try {
		const { address } = params;

		// Try to get common/popular BlockDAG tokens via RPC
		const commonTokens = require("../data/common-tokens.json");

		if (commonTokens.length === 0) {
			// No common tokens configured yet
			return {
				balance: "0",
				total: 0,
				totalFiatBalance: 0,
				tokens: [],
			};
		}

		const tokens = [];
		let totalFiatBalance = 0;

		for (const token of commonTokens) {
			try {
				// Get token balance using ERC20 balanceOf function via RPC
				const balanceResponse = await instance.post(
					BLOCKDAG_RPC,
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

				if (balanceResponse.data.result && balanceResponse.data.result !== "0x" && balanceResponse.data.result !== "0x0") {
					const balance = parseInt(balanceResponse.data.result, 16);
					if (balance > 0) {
						const amount = balance / Math.pow(10, token.decimals);
						const price = token.price || "0";
						const fiatBalance = amount * parseFloat(price);

						tokens.push({
							address: token.contractAddress,
							symbol: token.symbol,
							name: token.name,
							decimals: token.decimals,
							amount: amount.toString(),
							price: price,
							fiatBalance: fiatBalance,
							image: token.image || "https://cryptologos.cc/logos/blockdag-bdag-logo.png",
							tokenType: "ERC20",
							owner: address,
							contractAddress: token.contractAddress,
							rawAmount: balance.toString(),
						});

						totalFiatBalance += fiatBalance;
					}
				}
			} catch (tokenError) {
				console.log(`Error fetching token ${token.symbol}:`, tokenError.message);
				// Continue with next token if one fails
				continue;
			}
		}

		return {
			balance: totalFiatBalance.toFixed(2),
			total: tokens.length,
			totalFiatBalance: totalFiatBalance,
			tokens: tokens,
		};
	} catch (error) {
		console.error("Error getting BlockDAG tokens:", error.message || "Unknown error");
		return {
			balance: "0",
			total: 0,
			totalFiatBalance: 0,
			tokens: [],
		};
	}
};

/**
 * Get transaction list for a BlockDAG address
 * @param {Object} query - Query parameters containing address, page, and show
 * @returns {Array} Array of transactions
 */
const getTransactionsList = async (query) => {
	try {
		const { address, page = "0", show = "100" } = query;
		const pageNum = parseInt(page, 10);
		const showNum = parseInt(show, 10);

		// Try testnet RPC first, fallback to mainnet RPC
		let rpcUrl = BLOCKDAG_RPC;
		let response = null;

		try {
			response = await instance.post(
				rpcUrl,
				{
					jsonrpc: "2.0",
					method: "getAddressTxs",
					params: [address],
					id: 1,
				},
				{
					headers: { "Content-Type": "application/json" },
				}
			);
		} catch (testnetError) {
			console.log("Testnet RPC failed, trying mainnet RPC:", testnetError.message);
			// Fallback to mainnet RPC
			rpcUrl = BLOCKDAG_RPC;
			try {
				response = await instance.post(
					rpcUrl,
					{
						jsonrpc: "2.0",
						method: "getAddressTxs",
						params: [address],
						id: 1,
					},
					{
						headers: { "Content-Type": "application/json" },
					}
				);
			} catch (mainnetError) {
				console.error("Both RPC endpoints failed:", mainnetError.message);
				throw mainnetError;
			}
		}

		if (!response || !response.data || response.data.error) {
			const errorMsg = response?.data?.error?.message || "Unknown error";
			const errorCode = response?.data?.error?.code;

			// Log if method doesn't exist (code -32601)
			if (errorCode === -32601) {
				console.log(`BlockDAG RPC: getAddressTxs method not available on ${rpcUrl}. Returning empty transactions.`);
			} else {
				console.error("RPC error:", response?.data?.error || "Unknown error");
			}

			return {
				pagination: {
					records: "0",
					pages: "0",
					page: page,
				},
				transactions: [],
			};
		}

		// Parse the RPC response
		const transactionsData = response.data.result || [];
		const totalRecords = transactionsData.length;
		const totalPages = Math.ceil(totalRecords / showNum);

		// Apply pagination
		const startIndex = pageNum * showNum;
		const endIndex = startIndex + showNum;
		const paginatedTransactions = transactionsData.slice(startIndex, endIndex);

		// Transform transactions to expected format
		const transactions = paginatedTransactions.map((tx) => {
			// Parse transaction data - adjust based on actual RPC response format
			const value = tx.value ? (parseInt(tx.value, 16) / Math.pow(10, 18)).toFixed(6) : "0";
			const gasPrice = tx.gasPrice ? parseInt(tx.gasPrice, 16) : 0;
			const gasUsed = tx.gasUsed ? parseInt(tx.gasUsed, 16) : 0;
			const txnFee = (gasPrice * gasUsed) / Math.pow(10, 18);

			// Determine transaction type/direction
			const isOutgoing = tx.from && tx.from.toLowerCase() === address.toLowerCase();
			const traffic = isOutgoing ? "OUT" : "IN";
			const method = tx.input && tx.input !== "0x" && tx.input.length > 10 ? "Contract" : "Transfer";

			// Get block timestamp if available
			let date = "N/A";
			let age = "N/A";
			if (tx.timestamp) {
				const timestamp = typeof tx.timestamp === "string" ? parseInt(tx.timestamp, 16) : tx.timestamp;
				date = moment.unix(timestamp).format("YYYY-MM-DD HH:mm:ss");
				age = moment.unix(timestamp).fromNow();
			} else if (tx.blockNumber) {
				// If we have block number but no timestamp, we can't calculate age accurately
				date = "N/A";
				age = "N/A";
			}

			return {
				hash: tx.hash || tx.transactionHash || "0x" + "0".repeat(64),
				method: method,
				block: tx.blockNumber ? (typeof tx.blockNumber === "string" ? parseInt(tx.blockNumber, 16) : tx.blockNumber).toString() : "N/A",
				age: age,
				date: date,
				from: tx.from || address,
				traffic: traffic,
				to: tx.to || address,
				fiatAmount: "0.00", // Will be calculated if price is available
				amount: value,
				asset: "BDAG",
				txnFee: txnFee.toFixed(6),
				note: tx.note || "",
			};
		});

		return {
			pagination: {
				records: totalRecords.toString(),
				pages: totalPages.toString(),
				page: page,
			},
			transactions: transactions,
		};
	} catch (error) {
		console.error("Error getting BlockDAG transactions:", error.message || "Unknown error");
		return { pagination: { records: "0", pages: "0", page: "0" }, transactions: [] };
	}
};

/**
 * Get transaction status/details for a BlockDAG transaction
 * @param {Object} params - Parameters containing transaction ID
 * @returns {Object} Transaction details
 */
const getTransactionStatus = async (params) => {
	try {
		const { id } = params;

		// Get transaction details via RPC
		const response = await instance.post(
			BLOCKDAG_RPC,
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

			// Get transaction receipt for status
			let receipt = null;
			try {
				const receiptResponse = await instance.post(
					BLOCKDAG_RPC,
					{
						jsonrpc: "2.0",
						method: "eth_getTransactionReceipt",
						params: [id],
						id: 1,
					},
					{
						headers: { "Content-Type": "application/json" },
					}
				);
				receipt = receiptResponse.data.result;
			} catch (receiptError) {
				console.log("Receipt fetch failed:", receiptError.message);
			}

			return {
				blockNumber: tx.blockNumber ? parseInt(tx.blockNumber, 16) : "N/A",
				confirmations: receipt ? "1" : "0",
				from: tx.from,
				to: tx.to,
				value: tx.value ? (parseInt(tx.value, 16) / Math.pow(10, 18)).toFixed(6) : "0",
				gas: tx.gas ? parseInt(tx.gas, 16) : "0",
				gasPrice: tx.gasPrice ? parseInt(tx.gasPrice, 16) : "0",
				gasUsed: receipt && receipt.gasUsed ? parseInt(receipt.gasUsed, 16) : "0",
				nonce: tx.nonce ? parseInt(tx.nonce, 16) : "0",
				input: tx.input || "0x",
				hash: tx.hash,
				status: receipt ? (receipt.status === "0x1" ? "success" : "failed") : tx.blockNumber ? "success" : "pending",
				transactionIndex: tx.transactionIndex ? parseInt(tx.transactionIndex, 16) : "0",
			};
		}

		return { error: "Transaction not found" };
	} catch (error) {
		console.error("Error getting BlockDAG transaction status:", error.message || "Unknown error");
		return { error: "Failed to fetch transaction status" };
	}
};

/**
 * Get portfolio summary for a BlockDAG address
 * @param {Object} params - Parameters containing address
 * @returns {Object} Portfolio summary data
 */
const getPortfolioSummary = async (params) => {
	try {
		const { address } = params;

		// Get BDAG balance and price
		let bdagBalance = "0";
		let bdagPrice = "0.001"; // Default placeholder
		try {
			const balanceResponse = await instance.post(
				BLOCKDAG_RPC,
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
			bdagBalance = balanceResponse.data.result ? (parseInt(balanceResponse.data.result, 16) / Math.pow(10, 18)).toString() : "0";

			try {
				const priceData = await getTickerPrice({ symbol: "BDAG" });
				bdagPrice = priceData.price || "0.001";
			} catch (priceError) {
				console.log("Price fetch failed, using default");
			}
		} catch (error) {
			console.error("Portfolio summary BDAG data fetch failed:", error.message);
		}

		// Get all tokens
		const tokensData = await getTokens({ address }, { show: "100" });
		const tokens = tokensData.tokens || [];
		const totalTokenValue = tokensData.totalFiatBalance || 0;

		// Calculate total portfolio value
		const bdagValue = parseFloat(bdagBalance) * parseFloat(bdagPrice);
		const totalPortfolioValue = bdagValue + totalTokenValue;

		// Get transaction count
		let transactionCount = 0;
		try {
			const nonceResponse = await instance.post(
				BLOCKDAG_RPC,
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
			console.error("Transaction count fetch failed:", error.message);
		}

		return {
			address,
			totalPortfolioValue: totalPortfolioValue.toFixed(2),
			bdagBalance: parseFloat(bdagBalance).toFixed(8),
			bdagValue: bdagValue.toFixed(2),
			bdagPrice: bdagPrice,
			tokenCount: tokens.length,
			totalTokenValue: totalTokenValue.toFixed(2),
			transactionCount,
			tokens,
			lastUpdated: new Date().toISOString(),
		};
	} catch (error) {
		console.error("Error getting BlockDAG portfolio summary:", error.message || "Unknown error");
		return { error: "Failed to fetch portfolio summary" };
	}
};

/**
 * Get gas tracker information for BlockDAG
 * @param {Object} query - Query parameters
 * @returns {Object} Gas tracker data
 */
const getGasTracker = async (query) => {
	try {
		// Get gas price from RPC
		const response = await instance.post(
			BLOCKDAG_RPC,
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
	} catch (error) {
		console.error("Error getting BlockDAG gas tracker:", error.message || "Unknown error");
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
