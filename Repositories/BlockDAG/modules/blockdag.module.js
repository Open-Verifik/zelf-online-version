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

// BlockDAG RPC endpoint from the image http://13.234.176.105:18545
const BLOCKDAG_RPC = "https://rpc.awakening.bdagscan.com";
const BLOCKDAG_TESTNET_RPC = "https://testnet-rpc.blockdag.network";
const BLOCKDAG_EXPLORER = "";
const apiForAddressBalance = "https://api.awakening.bdagscan.com/v1/api/transaction/getAddressInfo?address=";

// https://api.awakening.bdagscan.com/v1/api/transaction/getAddressInfo?address=0x787389C8ec43D94362648310316F4348A4dE8C83

// sample response for the apiForAddressBalance
/**
	 * {
    "data": {
        "firstTransaction": {
            "txnHash": "0x58718723453c3959f530e5b4e2c080721f73827700bd6e4938563a61531e818f",
            "timestamp": "1763642016"
        },
        "lastTransaction": {
            "txnHash": "0x1c78e9bac582c9b841532a5f4191ca261b351898b2a644d0dfb3aa4e14e83bfd",
            "timestamp": "1763642207"
        },
        "balance": 140
    },
    "status": 200
}
	 */

const apiForAddressTransactions = "https://api.awakening.bdagscan.com/v1/api/transaction/getTransactionByAddress";
//?address=0x787389C8ec43D94362648310316F4348A4dE8C83&limit=10&page=1&export=false <-- those are the query parameters

// sample response for the apiForAddressTransactions
/**
 * {
    "data": [
        {
            "id": 86423,
            "status": "success",
            "txnHash": "0x1c78e9bac582c9b841532a5f4191ca261b351898b2a644d0dfb3aa4e14e83bfd",
            "blockId": "e0706793-294d-4f64-967f-459043f63a60",
            "from": "0x410344ab6f949cD9F9013c52d1E59932f0f08967",
            "to": "0x787389C8ec43D94362648310316F4348A4dE8C83",
            "value": "20",
            "txnFee": "0.000000021000147",
            "txnGasPrice": "0.000000000001000007",
            "gasUsed": "21000",
            "method": "transfer",
            "logMetaData": null,
            "contractAddress": "",
            "timestamp": "1763642207",
            "createdAt": "2025-11-20T12:37:10.981Z",
            "updatedAt": "2025-11-20T12:37:10.981Z",
            "block": {
                "blockNumber": "31770339"
            }
        },
        {
            "id": 86414,
            "status": "success",
            "txnHash": "0x15e6abb31019ea785c25130165febc349544a7642b33eeaa98565d546cf7bcb7",
            "blockId": "91c99ea5-148b-4f33-adca-bf58bdd1d0e1",
            "from": "0x002aF85c8865DE4604dF07a1105EfEF2b8e0dE05",
            "to": "0x787389C8ec43D94362648310316F4348A4dE8C83",
            "value": "10",
            "txnFee": "0.000000021000147",
            "txnGasPrice": "0.000000000001000007",
            "gasUsed": "21000",
            "method": "transfer",
            "logMetaData": null,
            "contractAddress": "",
            "timestamp": "1763642026",
            "createdAt": "2025-11-20T12:34:48.863Z",
            "updatedAt": "2025-11-20T12:34:48.863Z",
            "block": {
                "blockNumber": "31768963"
            }
        },
        {
            "id": 86413,
            "status": "success",
            "txnHash": "0x58718723453c3959f530e5b4e2c080721f73827700bd6e4938563a61531e818f",
            "blockId": "a6c2cd0a-d0a3-4f93-b3c4-17a4cb48cd28",
            "from": "0x410344ab6f949cD9F9013c52d1E59932f0f08967",
            "to": "0x787389C8ec43D94362648310316F4348A4dE8C83",
            "value": "10",
            "txnFee": "0.000000021000147",
            "txnGasPrice": "0.000000000001000007",
            "gasUsed": "21000",
            "method": "transfer",
            "logMetaData": null,
            "contractAddress": "",
            "timestamp": "1763642016",
            "createdAt": "2025-11-20T12:34:42.605Z",
            "updatedAt": "2025-11-20T12:34:42.605Z",
            "block": {
                "blockNumber": "31768881"
            }
        }
    ],
    "status": 200
}
 */

// Helper function to get address balance from API
const getAddressBalanceFromAPI = async (address) => {
	try {
		const response = await instance.get(`${apiForAddressBalance}${address}`, {
			headers: { "Content-Type": "application/json" },
		});

		if (response.data && response.data.status === 200 && response.data.data) {
			const balance = response.data.data.balance;
			return balance !== undefined && balance !== null ? balance.toString() : "0";
		}
		throw new Error("Invalid API response");
	} catch (error) {
		console.error("BlockDAG API balance fetch failed:", error.message);
		throw error;
	}
};

// Helper function to get address transactions from API
const getAddressTransactionsFromAPI = async (address, page = 1, limit = 20) => {
	try {
		const response = await instance.get(apiForAddressTransactions, {
			params: {
				address: address,
				page: page,
				limit: limit,
				export: false,
			},
			headers: { "Content-Type": "application/json" },
		});

		if (response.data && response.data.status === 200 && response.data.data) {
			return response.data.data;
		}
		throw new Error("Invalid API response");
	} catch (error) {
		console.error("BlockDAG API transactions fetch failed:", error.message);
		throw error;
	}
};

/**
 * Transform API transaction format to expected format
 * @param {Object} tx - Transaction from API
 * @param {string} address - Address to determine transaction direction
 * @returns {Object} Transformed transaction
 */
const transformApiTransaction = (tx, address) => {
	const isOutgoing = tx.from && tx.from.toLowerCase() === address.toLowerCase();
	const traffic = isOutgoing ? "OUT" : "IN";
	const method = tx.method || (tx.contractAddress && tx.contractAddress !== "" ? "Contract" : "Transfer");

	// Parse timestamp
	let date = "N/A";
	let age = "N/A";
	if (tx.timestamp) {
		const timestamp = typeof tx.timestamp === "string" ? parseInt(tx.timestamp, 10) : tx.timestamp;
		date = moment.unix(timestamp).format("YYYY-MM-DD HH:mm:ss");
		age = moment.unix(timestamp).fromNow();
	}

	return {
		hash: tx.txnHash || "0x" + "0".repeat(64),
		method: method,
		block: tx.block?.blockNumber || "N/A",
		age: age,
		date: date,
		from: tx.from || address,
		traffic: traffic,
		to: tx.to || address,
		fiatAmount: "0.00",
		amount: tx.value || "0",
		asset: "BDAG",
		txnFee: tx.txnFee || "0",
		note: tx.note || "",
		status: tx.status || "success",
	};
};

/**
 * Transform RPC transaction format to expected format
 * @param {Object} tx - Transaction from RPC
 * @param {string} address - Address to determine transaction direction
 * @returns {Object} Transformed transaction
 */
const transformRpcTransaction = (tx, address) => {
	// Parse transaction data
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
		fiatAmount: "0.00",
		amount: value,
		asset: "BDAG",
		txnFee: txnFee.toFixed(6),
		note: tx.note || "",
	};
};

/**
 * Fetch transactions from RPC endpoint
 * @param {string} address - Address to fetch transactions for
 * @returns {Array} Array of raw RPC transactions
 */
const fetchTransactionsFromRPC = async (address) => {
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
		const errorCode = response?.data?.error?.code;
		if (errorCode === -32601) {
			console.log(`BlockDAG RPC: getAddressTxs method not available on ${rpcUrl}. Returning empty transactions.`);
		} else {
			console.error("RPC error:", response?.data?.error || "Unknown error");
		}
		throw new Error(response?.data?.error?.message || "RPC request failed");
	}

	return response.data.result || [];
};

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
 * Fetch BDAG balance with API fallback to RPC
 * @param {string} address - Address to fetch balance for
 * @returns {Promise<string>} Balance as string
 */
const fetchBdagBalance = async (address) => {
	try {
		return await getAddressBalanceFromAPI(address);
	} catch (apiError) {
		console.log("BlockDAG API balance fetch failed, trying RPC:", apiError.message);
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
			return balanceResponse.data.result ? (parseInt(balanceResponse.data.result, 16) / Math.pow(10, 18)).toString() : "0";
		} catch (error) {
			console.error("BlockDAG RPC balance fetch failed:", error.message);
			return "0";
		}
	}
};

/**
 * Fetch BDAG price from exchange or use default
 * @returns {Promise<string>} Price as string
 */
const fetchBdagPrice = async () => {
	try {
		const priceData = await getTickerPrice({ symbol: "BDAG" });
		return priceData.price || "0";
	} catch (error) {
		console.log("BlockDAG price fetch failed, using default:", error.message);
		return "0.001"; // Placeholder price
	}
};

/**
 * Fetch tokens for an address
 * @param {string} address - Address to fetch tokens for
 * @returns {Promise<Object>} Object with tokens array and totalFiatBalance
 */
const fetchAddressTokens = async (address) => {
	try {
		const tokensData = await getTokens({ address }, { show: "100" });
		return {
			tokens: tokensData.tokens || [],
			totalFiatBalance: tokensData.totalFiatBalance || 0,
		};
	} catch (error) {
		console.error("BlockDAG tokens fetch failed:", error.message);
		return {
			tokens: [],
			totalFiatBalance: 0,
		};
	}
};

/**
 * Create native BDAG token object
 * @param {string} address - Wallet address
 * @param {string} balance - BDAG balance
 * @param {string} price - BDAG price
 * @param {number} fiatBalance - Fiat balance value
 * @returns {Object} Native BDAG token object
 */
const createNativeBdagToken = (address, balance, price, fiatBalance) => {
	return {
		tokenType: "BDAG",
		fiatBalance: fiatBalance,
		symbol: "BDAG",
		name: "BlockDAG",
		price: price,
		amount: balance,
		image: "https://arweave.net/C3UN6v_nJT81_3dhsIw5dGP0kjPTfUu6LSDqRwmW0OQ",
		address: address,
		decimals: 18,
	};
};

/**
 * Create error transaction object
 * @param {string} address - Wallet address
 * @param {string} errorMessage - Error message
 * @returns {Object} Error transaction object
 */
const createErrorTransaction = (address, errorMessage) => {
	return [
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
			note: `Transaction fetch failed: ${errorMessage}`,
		},
	];
};

/**
 * Fetch transactions for an address with timeout
 * @param {string} address - Address to fetch transactions for
 * @returns {Promise<Array>} Array of transactions
 */
const fetchAddressTransactions = async (address) => {
	try {
		const transactionTimeoutPromise = new Promise((_, reject) => {
			setTimeout(() => reject(new Error("Transaction fetch timeout")), 6000);
		});

		const transactionDataPromise = getTransactionsList({
			address,
			page: "0",
			show: "20",
		});

		const transactionsData = await Promise.race([transactionDataPromise, transactionTimeoutPromise]);
		return transactionsData.transactions || [];
	} catch (error) {
		console.error("Transaction fetch failed:", error.message);
		return createErrorTransaction(address, error.message);
	}
};

/**
 * Build address response object
 * @param {string} address - Wallet address
 * @param {string} balance - BDAG balance
 * @param {string} price - BDAG price
 * @param {number} fiatBalance - Fiat balance
 * @param {Array} tokens - Array of tokens
 * @param {Array} transactions - Array of transactions
 * @param {number} totalFiatBalance - Total fiat balance from tokens
 * @returns {Object} Complete address response object
 */
const buildAddressResponse = (address, balance, price, fiatBalance, tokens, transactions, totalFiatBalance) => {
	const totalPortfolioValue = fiatBalance + totalFiatBalance;

	return {
		address,
		balance,
		fiatBalance,
		totalPortfolioValue,
		price,
		type: "system_account",
		account: {
			asset: "BDAG",
			fiatBalance: fiatBalance.toString(),
			price,
		},
		tokenHoldings: {
			total: tokens.length,
			balance: (fiatBalance + totalFiatBalance).toString(),
			tokens,
		},
		transactions,
	};
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
			// Fetch all data in parallel where possible
			const [bdagBalance, bdagPrice, tokensData] = await Promise.all([
				fetchBdagBalance(address),
				fetchBdagPrice(),
				fetchAddressTokens(address),
			]);

			// Calculate fiat balance
			const fiatBalance = parseFloat(bdagBalance) * parseFloat(bdagPrice);

			// Add native BDAG token to tokens array
			const tokens = [...tokensData.tokens];
			const nativeBdagToken = createNativeBdagToken(address, bdagBalance, bdagPrice, fiatBalance);
			tokens.unshift(nativeBdagToken);

			// Fetch transactions
			const transactions = await fetchAddressTransactions(address);

			// Build and return response
			return buildAddressResponse(address, bdagBalance, bdagPrice, fiatBalance, tokens, transactions, tokensData.totalFiatBalance);
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
							image: token.image || "https://arweave.net/C3UN6v_nJT81_3dhsIw5dGP0kjPTfUu6LSDqRwmW0OQ",
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

		// Try API first, fallback to RPC
		let transactionsData = [];
		let totalRecords = 0;

		try {
			// API uses 1-based pagination, so add 1 to pageNum
			const apiPage = pageNum + 1;
			const apiTransactions = await getAddressTransactionsFromAPI(address, apiPage, showNum);
			transactionsData = apiTransactions.map((tx) => transformApiTransaction(tx, address));
			totalRecords = apiTransactions.length;
		} catch (apiError) {
			console.log("BlockDAG API transactions fetch failed, trying RPC:", apiError.message);

			try {
				const rpcTransactions = await fetchTransactionsFromRPC(address);
				totalRecords = rpcTransactions.length;

				// Apply pagination
				const startIndex = pageNum * showNum;
				const endIndex = startIndex + showNum;
				const paginatedTransactions = rpcTransactions.slice(startIndex, endIndex);

				transactionsData = paginatedTransactions.map((tx) => transformRpcTransaction(tx, address));
			} catch (rpcError) {
				console.error("BlockDAG RPC transactions fetch failed:", rpcError.message);
				return {
					pagination: {
						records: "0",
						pages: "0",
						page: page,
					},
					transactions: [],
				};
			}
		}

		const totalPages = Math.ceil(totalRecords / showNum);

		return {
			pagination: {
				records: totalRecords.toString(),
				pages: totalPages.toString(),
				page: page,
			},
			transactions: transactionsData,
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

		// If transaction not found, it might be dropped or never existed
		if (!response.data.result || response.data.result === null) {
			return {
				error: "Transaction not found",
				status: "dropped",
				hash: id,
			};
		}

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

		// Determine transaction status
		let status = "pending";
		if (receipt) {
			// If receipt exists, check status field
			if (receipt.status === "0x1" || receipt.status === 1) {
				status = "success";
			} else if (receipt.status === "0x0" || receipt.status === 0) {
				status = "failed";
			} else {
				status = "pending";
			}
		} else if (tx.blockNumber) {
			// Transaction is in a block but no receipt yet (shouldn't happen normally)
			// Check if transaction is in a block - if yes, assume success for now
			// But ideally we should have a receipt
			status = "pending";
		} else {
			// Transaction exists but not in a block - check if it's been pending too long
			// For now, mark as pending
			status = "pending";
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
			status: status,
			transactionIndex: tx.transactionIndex ? parseInt(tx.transactionIndex, 16) : "0",
		};
	} catch (error) {
		console.error("Error getting BlockDAG transaction status:", error.message || "Unknown error");
		return { error: "Failed to fetch transaction status", status: "error" };
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
