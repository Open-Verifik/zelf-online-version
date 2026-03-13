const axios = require("axios");
const https = require("https");
const moment = require("moment");
const { getTickerPrice } = require("../../binance/modules/binance.module");
const { get_ApiKey } = require("../../Solana/modules/oklink");
const agent = new https.Agent({
	rejectUnauthorized: false,
});

const urlBase = "https://www.oklink.com";
/**
 * @param {*} params
 */

const getAddress = async (params) => {
	const t = Date.now();
	try {
		const address = params.id;

		const { data } = await axios.get(
			`${urlBase}/api/explorer/v2/common/address/getHolderInfo?address=${address}&blockChain=SUI&t=${t}`,

			{
				httpsAgent: agent,
				headers: {
					"X-Apikey": get_ApiKey().getApiKey(),
					"User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/132.0.0.0 Safari/537.36",
				},
			}
		);

		// Check if API returned an error or invalid response
		if (!data || !data.data) {
			throw new Error("Invalid response from API");
		}

		const { price } = await getTickerPrice({ symbol: "SUI" });

		// Safely get transactions, handle errors gracefully
		let transactions = [];
		try {
			const transactionsData = await getTransactions({ id: address }, { page: "0", show: "10" });
			transactions = transactionsData.transactions || [];
		} catch (error) {
			console.error("Error fetching transactions:", error.message);
			transactions = [];
		}

		// Safely get tokens, handle errors gracefully
		let tokens = [];
		try {
			tokens = await getTokens({ id: address }, { page: "0", show: "10" });
		} catch (error) {
			console.error("Error fetching tokens:", error.message);
			tokens = [];
		}

		// Safely extract values with defaults for zero-balance addresses
		const balance = data.data.balance || 0;
		const usdBalance = data.data.usdBalance || 0;
		const tokenUsdValue = data.data.tokenUsdValue || 0;
		const tokenNum = data.data.tokenNum || 0;

		// Check if SUI token already exists in tokens array
		let hasSuiToken = false;
		for (let index = 0; index < tokens.length; index++) {
			const token = tokens[index];
			if (token.symbol === "SUI" || token.tokenType === "SUI") {
				token.tokenType = "SUI";
				hasSuiToken = true;
				break;
			}
		}

		// Always include native SUI token at the beginning (even if balance is 0)
		if (!hasSuiToken) {
			tokens.unshift({
				_fiatBalance: usdBalance.toString(),
				address_token: "0x2",
				amount: balance.toString(),
				fiatBalance: usdBalance,
				image: "https://static.oklink.com/cdn/web3/currency/token/small/784-0x2::sui::SUI-1?v=1742304132417",
				name: "Sui",
				price: price,
				symbol: "SUI",
				tokenType: "SUI",
			});
		}

		const response = {
			_balance: balance,
			_fiatBalance: usdBalance.toString(),
			address,
			balance: balance.toString(),
			fiatBalance: usdBalance,
			account: {
				asset: "SUI",
				fiatBalance: usdBalance,
				price: price,
			},
			tokenHoldings: {
				balance: tokenUsdValue.toString(),
				total: tokens.length,
				tokens: tokens,
			},
			transactions: transactions,
		};

		return response;
	} catch (error) {
		console.error("Error in getAddress:", error.message);

		// Return a consistent structure even on error
		const address = params.id;
		let price = "0";
		try {
			const priceData = await getTickerPrice({ symbol: "SUI" });
			price = priceData.price || "0";
		} catch (priceError) {
			console.error("Error fetching price:", priceError.message);
		}

		// Always include native SUI token even on error
		const defaultSuiToken = {
			_fiatBalance: "0",
			address_token: "0x2",
			amount: "0",
			fiatBalance: 0,
			image: "https://static.oklink.com/cdn/web3/currency/token/small/784-0x2::sui::SUI-1?v=1742304132417",
			name: "Sui",
			price: price,
			symbol: "SUI",
			tokenType: "SUI",
		};

		return {
			_balance: 0,
			_fiatBalance: "0",
			address,
			balance: "0",
			fiatBalance: 0,
			account: {
				asset: "SUI",
				fiatBalance: 0,
				price,
			},
			tokenHoldings: {
				balance: "0",
				total: 1,
				tokens: [defaultSuiToken],
			},
			transactions: [],
		};
	}
};
/**
 *
 * @param {Object} params - Contiene el id (dirección)
 * @param {Object} query - Parámetros adicionales
 */
const getTokens = async (params, query) => {
	try {
		const t = Date.now();
		const { data } = await axios.get(
			`${urlBase}/api/explorer/v2/sui/addresses/${params.id}/holders/token?offset=${query.page}&limit=${query.show}&t=${t}`,

			{
				httpsAgent: agent,
				headers: {
					"X-Apikey": get_ApiKey().getApiKey(),
					"User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/132.0.0.0 Safari/537.36",
				},
			}
		);

		// Handle empty or invalid response
		if (!data || !data.data || !data.data.hits || !Array.isArray(data.data.hits)) {
			return [];
		}

		function formatCryptoData(data) {
			return data.map((item) => ({
				_fiatBalance: item.usdValue ? item.usdValue.toString() : "0",
				address_token: item.tokenType ? item.tokenType.split("::")[0] : "",
				amount: item.value ? item.value.toString() : "0",
				fiatBalance: item.usdValue || 0,
				image: item.logoUrl || "",
				name: item.coinName || "Unknown",
				price: item.price ? item.price.toString() : "0",
				symbol: item.symbol || "Unknown",
				tokenType: item.symbol || "Unknown",
			}));
		}

		return formatCryptoData(data.data.hits);
	} catch (error) {
		console.error("Error in getTokens:", error.message);
		return [];
	}
};

/**
 * get transactions list
 * @param {Object} params
 * @returns
 */
const getTransactions = async (params, query) => {
	try {
		const address = params.id;

		const page = query.page;

		const show = query.show;

		const t = Date.now();

		const { data } = await axios.get(
			`${urlBase}/api/explorer/v2/sui/addresses/${address}/transactionsByClassfy/condition?offset=${query.page}&limit=${query.show}&address=${address}&nonzeroValue=false&t=${t}`,
			{
				httpsAgent: agent,
				headers: {
					"X-Apikey": get_ApiKey().getApiKey(),
					"User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/132.0.0.0 Safari/537.36",
				},
			}
		);

		// Handle empty or invalid response
		if (!data || !data.data) {
			return {
				pagination: { records: "0", page, show },
				transactions: [],
			};
		}

		const hits = data.data.hits || [];
		const total = data.data.total || 0;

		function formatCryptoData(data) {
			const formattedTransactions = data.map((item) => ({
				_amount: item.amount || 0,
				_source: item,
				age: item.timestamp ? moment(item.timestamp).fromNow() : "",
				amount: item.amount ? Number(item.amount).toFixed(6) : "0.000000",
				asset: "SUI",
				block: item.checkpoint ? item.checkpoint.toString() : "0",
				date: item.timestamp ? moment(item.timestamp).format("YYYY-MM-DD HH:mm:ss") : "",
				fiatBalance: item.usdValue || 0,
				from: item.from || "",
				gas: item.gas ? item.gas.toString() : "0",
				hash: item.hash || "",
				method: item.method || "",
				timestamp: item.timestamp || 0,
				to: item.to || "",
				traffic: item.from === address ? "OUT" : "IN",
				txnFee: item.fee ? item.fee.toString() : "0",
			}));

			// Sort by timestamp (newest first)
			return formattedTransactions.sort((a, b) => b.timestamp - a.timestamp);
		}

		return {
			pagination: { records: total.toString(), page, show },
			transactions: formatCryptoData(hits),
		};
	} catch (error) {
		console.error("Error in getTransactions:", error.message);
		return {
			pagination: { records: "0", page: query.page, show: query.show },
			transactions: [],
		};
	}
};

/**
 * get transaction status
 * @param {Object} params
 */
const getTransaction = async (params) => {
	try {
		const t = Date.now();
		const { data } = await axios.get(`${urlBase}/api/explorer/v1/sui/transactionDetail?txHash=${params.id}&t=${t}`, {
			httpsAgent: agent,
			headers: {
				"X-Apikey": get_ApiKey().getApiKey(),
				"User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/132.0.0.0 Safari/537.36",
			},
		});

		if (data.code == 404) {
			const error = new Error("transaction_not_found");
			error.status = 404;
			throw error;
		}
		const response = {
			_source: data.data,
			age: moment(data.data.timestamp).fromNow(),
			amount: data.data.amount,
			block: data.data.height.toString(),
			computationCostFee: data.data.computationCostFee,
			confirmedNumber: data.data.confirmedNumber,
			date: moment(data.data.timestamp).format("YYYY-MM-DD HH:mm:ss"),
			from: data.data.from,
			gasBudget: data.data.gasBudget,
			gasPayment: data.data.gasPayment,
			gasPrice: data.data.gasPrice,
			hash: data.data.hash,
			nonRefundableStorageFee: data.data.nonRefundableStorageFee,
			status: data.data.status,
			to: data.data.to,
			tokenTransferNum: data.data.tokenTransferNum,
			txFee: data.data.totalGasFee,
		};

		return response;
	} catch (exception) {
		const error = new Error("timeout_data_source");
		error.status = 500;
		throw error;
	}
};

const getGasTracker = async (params) => {
	return response;
};
module.exports = {
	getAddress,
	getTransactions,
	getTransaction,
	getTokens,
};
