const axios = require("axios");
const moment = require("moment");
const cheerio = require("cheerio");
const { generateRandomUserAgent } = require("../../../Core/helpers");
const { get_ApiKey } = require("../../Solana/modules/oklink");
const { getTickerPrice } = require("../../binance/modules/binance.module");
const { idAseet_ } = require("../../dataAnalytics/modules/dataAnalytics.module");

// Create axios instance with timeout and better error handling
const instance = axios.create({
	timeout: 30000,
	validateStatus: function (status) {
		return status < 500; // Resolve only if status is less than 500
	},
});

// Create https agent that ignores invalid SSL certificates
const https = require("https");
const agent = new https.Agent({ rejectUnauthorized: false });

// Kava API endpoints
const KAVA_API_BASE = "https://api.kava.io";
const KAVASCAN_BASE = "https://kavascan.com";
const KAVA_EVM_RPC = "https://evm.kava.io";

/**
 * Get address balance and details from Kava
 * @param {Object} params - Contains address
 */
const getAddress = async (params) => {
	try {
		const address = params.address;

		// Get KAVA price
		const { price: kavaPrice } = await getTickerPrice({ symbol: "KAVA" });

		let kavaBalance = "0";
		let evmBalance = "0";

		// Check if it's a Cosmos address or EVM address
		const isCosmosAddress = address.startsWith("kava1") && address.length === 44;
		const isEvmAddress = address.startsWith("0x") && address.length === 42;

		if (isCosmosAddress) {
			// Get native KAVA balance using Kava API for Cosmos addresses
			try {
				const balanceResponse = await instance.get(`${KAVA_API_BASE}/cosmos/bank/v1beta1/balances/${address}`, {
					headers: { "user-agent": generateRandomUserAgent() },
				});

				if (balanceResponse.data.balances) {
					const kavaCoin = balanceResponse.data.balances.find((coin) => coin.denom === "ukava");
					if (kavaCoin) {
						kavaBalance = (parseFloat(kavaCoin.amount) / 1000000).toString(); // Convert from ukava to KAVA
					}
				}
			} catch (error) {
				console.log("Cosmos balance fetch failed, continuing with EVM only");
			}
		}

		if (isEvmAddress) {
			// Get EVM balance for EVM addresses
			try {
				const evmBalanceResponse = await instance.post(
					KAVA_EVM_RPC,
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

				evmBalance = evmBalanceResponse.data.result ? (parseInt(evmBalanceResponse.data.result, 16) / Math.pow(10, 18)).toString() : "0";
			} catch (error) {
				console.log("EVM balance fetch failed:", error.message);
			}
		}

		// Get tokens using OKLink API (similar to other EVM chains)
		let tokens = { balance: "0", total: 0, tokens: [] };
		try {
			tokens = await getTokens({ address }, { show: "100" });
		} catch (error) {
			console.log("Token fetch failed:", error.message);
		}

		// Get transactions
		let transactions = [];
		try {
			transactions = await getTransactionsList({
				address,
				page: "1",
				show: "10",
			});
		} catch (error) {
			console.log("Transaction fetch failed:", error.message);
		}

		// Calculate total fiat balance
		const totalFiatBalance = parseFloat(kavaBalance) * kavaPrice + parseFloat(evmBalance) * kavaPrice + parseFloat(tokens.balance || "0");

		const response = {
			address,
			balance: kavaBalance,
			evmBalance: evmBalance,
			fiatBalance: totalFiatBalance,
			type: "system_account",
			account: {
				asset: "KAVA",
				fiatBalance: totalFiatBalance.toString(),
				price: kavaPrice,
			},
			tokenHoldings: {
				total: tokens.total || 0,
				balance: tokens.balance || "0",
				tokens: tokens.tokens || [],
			},
			transactions,
		};

		return response;
	} catch (error) {
		console.error("Kava getAddress error:", error.message || "Unknown error");
		throw error;
	}
};

/**
 * Get ERC20 tokens for an address
 * @param {Object} params - Contains address
 * @param {Object} query - Additional parameters
 */
const getTokens = async (params, query) => {
	try {
		const { address } = params;
		const t = Date.now();

		// Use OKLink API for ERC20 tokens (Kava is EVM compatible)
		const url = `https://www.oklink.com/api/explorer/v2/kava/addresses/${address}/tokens?offset=0&limit=${query.show || "100"}&t=${t}`;

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

		if (!data?.data?.hits) {
			return {
				balance: "0",
				total: 0,
				tokens: [],
			};
		}

		// Format tokens
		const formattedTokens = await Promise.all(
			data.data.hits.map(async (token) => {
				let idAseet;
				try {
					idAseet = await idAseet_(token.symbol);
				} catch (error) {
					idAseet = {};
				}

				return {
					_amount: parseFloat(token.value),
					_fiatBalance: token.legalRate?.toString() || "0",
					_price: token.legalRate || 0,
					address: token.tokenContractAddress,
					amount: token.value.toString(),
					decimals: token.decimals || 18,
					fiatBalance: parseFloat(token.legalRate || 0),
					image: `https://s2.coinmarketcap.com/static/img/coins/64x64/${idAseet.idAseet || 1}.png`,
					name: token.tokenName,
					price: token.legalRate?.toString() || "0",
					symbol: token.symbol,
					tokenType: "ERC-20",
				};
			})
		);

		// Calculate total fiat balance
		const totalFiatBalance = formattedTokens.reduce((sum, token) => sum + parseFloat(token.fiatBalance), 0);

		return {
			balance: totalFiatBalance.toString(),
			total: data.data.hits.length,
			tokens: formattedTokens,
		};
	} catch (error) {
		console.error("Error getting Kava tokens:", error.message || "Unknown error");
		return {
			balance: "0",
			total: 0,
			tokens: [],
		};
	}
};

/**
 * Get transactions list for an address
 * @param {Object} params - Contains address and pagination
 */
const getTransactionsList = async (params) => {
	try {
		const { address, page, show } = params;
		const t = Date.now();

		// Use OKLink API for transactions
		const url = `https://www.oklink.com/api/explorer/v2/kava/addresses/${address}/transactionsByClassfy/condition?offset=${page || "0"}&limit=${
			show || "100"
		}&address=${address}&nonzeroValue=false&t=${t}`;

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

		if (!data?.data?.hits) {
			return [];
		}

		// Format transactions
		const transactions = data.data.hits.map((tx) => ({
			age: moment(tx.blocktime * 1000).fromNow(),
			amount: tx.value.toFixed(6),
			asset: "KAVA",
			block: tx.blockHeight.toString(),
			date: moment(tx.blocktime * 1000).format("YYYY-MM-DD HH:mm:ss"),
			from: tx.from,
			hash: tx.hash,
			method: tx.method.startsWith("swap") ? "Swap" : tx.method,
			to: tx.to,
			traffic: tx.realValue < 0 ? "OUT" : "IN",
			txnFee: tx.fee.toFixed(6),
			timestamp: tx.blocktime, // Keep original timestamp for sorting
		}));

		// Sort by timestamp (newest first)
		return transactions.sort((a, b) => b.timestamp - a.timestamp);
	} catch (error) {
		console.error("Error getting Kava transactions:", error.message || "Unknown error");
		return [];
	}
};

/**
 * Get transaction details from KavaScan
 * @param {Object} params - Contains transaction hash
 */
const getTransactionStatus = async (params) => {
	try {
		const { id } = params;

		// First try OKLink API
		const t = Date.now();
		const url = `https://www.oklink.com/api/explorer/v1/kava/transactions/${id}?t=${t}`;

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

		if (data?.data) {
			const details = data.data;
			const { price: kavaPrice } = await getTickerPrice({ symbol: "KAVA" });

			const transaction = {
				age: moment(details.blocktime * 1000).fromNow(),
				amount: details.value.toString(),
				assetPrice: details.legalRate?.toString() || kavaPrice.toString(),
				block: details.blockHeight,
				confirmations: details.confirm,
				date: moment(details.blocktime * 1000).format("YYYY-MM-DD HH:mm:ss"),
				from: details.from,
				gasPrice: details.gasPrice?.toString() || "0",
				hash: id,
				image: details.logoUrl || "https://www.mintscan.io/kava/static/img/kava-logo.svg",
				status: details.status === "0x1" ? "Success" : "Failed",
				to: details.to,
				txnFee: details.fee?.toString() || "0",
				type: details.inputHex === "0x" ? "transfer" : "contract",
				network: "kava",
			};

			return transaction;
		}

		// Fallback to KavaScan scraping
		const { data: htmlData } = await instance.get(`${KAVASCAN_BASE}/tx/${id}`, {
			headers: {
				"user-agent": generateRandomUserAgent(),
				"Upgrade-Insecure-Requests": "1",
			},
		});

		const $ = cheerio.load(htmlData);

		// Extract transaction details from KavaScan HTML
		const status = $(".badge-success, .badge-danger").text().trim() || "Unknown";
		const block = $("a[href*='/block/']").first().text().trim();
		const timestamp = $(".text-muted").first().text().trim();
		const from = $("a[href*='/address/']").first().attr("href")?.split("/address/")[1];
		const to = $("a[href*='/address/']").eq(1).attr("href")?.split("/address/")[1];
		const value = $(".text-monospace").first().text().trim();
		const fee = $(".text-monospace").eq(1).text().trim();

		const transaction = {
			age: moment(timestamp).fromNow(),
			amount: value,
			block,
			date: moment(timestamp).format("YYYY-MM-DD HH:mm:ss"),
			from,
			hash: id,
			image: "https://www.mintscan.io/kava/static/img/kava-logo.svg",
			network: "kava",
			status: status === "Success" ? "Success" : "Failed",
			to,
			txnFee: fee,
			type: "transfer",
		};

		return transaction;
	} catch (error) {
		console.error("Error getting Kava transaction:", error.message || "Unknown error");
		const errorObj = new Error("transaction_not_found");
		errorObj.status = 404;
		throw errorObj;
	}
};

/**
 * Get gas tracker information for Kava
 * @param {Object} params - Query parameters
 */
const getGasTracker = async (params) => {
	try {
		// Get current gas price from Kava EVM RPC
		const gasPriceResponse = await instance.post(
			KAVA_EVM_RPC,
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

		const gasPrice = gasPriceResponse.data.result ? parseInt(gasPriceResponse.data.result, 16) : 0;

		// Get Kava price for USD conversion
		const { price: kavaPrice } = await getTickerPrice({ symbol: "KAVA" });

		// Calculate gas costs in USD
		const gasPriceGwei = gasPrice / Math.pow(10, 9);
		const gasPriceUSD = (gasPriceGwei * kavaPrice) / Math.pow(10, 9);

		// Estimate transaction costs
		const standardGasLimit = 21000; // Standard ETH transfer
		const standardCost = (gasPrice * standardGasLimit) / Math.pow(10, 18);
		const standardCostUSD = standardCost * kavaPrice;

		const response = {
			low: {
				gwei: gasPriceGwei.toFixed(2),
				cost: `$${standardCostUSD.toFixed(6)}`,
				time: "~5 seconds",
			},
			average: {
				gwei: gasPriceGwei.toFixed(2),
				cost: `$${standardCostUSD.toFixed(6)}`,
				time: "~5 seconds",
			},
			high: {
				gwei: gasPriceGwei.toFixed(2),
				cost: `$${standardCostUSD.toFixed(6)}`,
				time: "~5 seconds",
			},
			featuredActions: [
				{
					action: "Transfer KAVA",
					low: `$${standardCostUSD.toFixed(6)}`,
					average: `$${standardCostUSD.toFixed(6)}`,
					high: `$${standardCostUSD.toFixed(6)}`,
				},
			],
		};

		return response;
	} catch (error) {
		console.error("Error getting Kava gas tracker:", error.message || "Unknown error");
		throw error;
	}
};

module.exports = {
	getAddress,
	getTokens,
	getTransactionsList,
	getTransactionStatus,
	getGasTracker,
};
