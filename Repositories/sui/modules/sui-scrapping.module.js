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

		const { price } = await getTickerPrice({ symbol: "SUI" });

		const { transactions } = await getTransactions({ id: address }, { page: "0", show: "10" });

		const response = {
			_balance: data.data.balance,
			_fiatBalance: data.data.usdBalance.toString(),
			address,
			balance: data.data.balance.toString(),
			fiatBalance: data.data.usdBalance,
			fullName: "",
			account: {
				asset: "SUI",
				fiatBalance: data.data.usdBalance,
				price: price,
			},
			tokenHoldings: {
				balance: data.data.tokenUsdValue.toString(),
				total: data.data.tokenNum,
				tokens: await getTokens({ id: address }, { page: "0", show: "10" }),
			},
			transactions: transactions,
		};

		return response;
	} catch (error) {}
};
/**
 *
 * @param {Object} params - Contiene el id (dirección)
 * @param {Object} query - Parámetros adicionales
 */
const getTokens = async (params, query) => {
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

	function formatCryptoData(data) {
		return data.map((item) => ({
			_fiatBalance: item.usdValue.toString(),
			address_token: item.tokenType.split("::")[0],
			amount: item.value ? item.value.toString() : "0",
			fiatBalance: item.usdValue || 0,
			image: item.logoUrl || "",
			name: item.coinName || "Unknown",
			price: item.price ? item.price.toString() : "0",
			symbol: item.symbol || "Unknown",
			tokenType: item.symbol,
		}));
	}

	return formatCryptoData(data.data.hits);
};

/**
 * get transactions list
 * @param {Object} params
 * @returns
 */
const getTransactions = async (params, query) => {
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

	function formatCryptoData(data) {
		return data.map((item) => ({
			_amount: item.amount,
			_source: item,
			age: moment(item.timestamp).fromNow(),
			amount: Number(item.amount).toFixed(6),
			asset: "SUI",
			block: item.checkpoint.toString(),
			date: moment(item.timestamp).format("YYYY-MM-DD HH:mm:ss"),
			fiatBalance: item.usdValue || 0,
			from: item.from,
			gas: item.gas.toString(),
			hash: item.hash,
			method: item.method,
			timestamp: item.timestamp,
			to: item.to,
			traffic: item.from === address ? "OUT" : "IN",
			txnFee: item.fee.toString(),
		}));
	}

	return {
		pagination: { records: data.data.total.toString(), page, show },
		transactions: formatCryptoData(data.data.hits),
	};
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
