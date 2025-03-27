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
					"User-Agent":
						"Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/132.0.0.0 Safari/537.36",
				},
			}
		);

		const { price } = await getTickerPrice({ symbol: "SUI" });

		const { transactions } = await getTransactions(
			{ id: address },
			{ page: "0", show: "10" }
		);

		console.log({ data });
		const response = {
			address,
			fullName: "",
			balance: data.data.balance.toString(),
			_balance: data.data.balance,
			fiatBalance: data.data.usdBalance,
			_fiatBalance: data.data.usdBalance.toString(),
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
	} catch (error) {
		console.log(error);
	}
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
				"User-Agent":
					"Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/132.0.0.0 Safari/537.36",
			},
		}
	);

	function formatCryptoData(data) {
		return data.map((item) => ({
			tokenType: item.symbol,
			address_token: item.tokenType.split("::")[0],
			fiatBalance: item.usdValue || 0,
			_fiatBalance: item.usdValue.toString(),
			symbol: item.symbol || "Unknown",
			name: item.coinName || "Unknown",
			price: item.price ? item.price.toString() : "0",
			image: item.logoUrl || "",
			amount: item.value ? item.value.toString() : "0",
		}));
	}
	console.log(data.data);

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
				"User-Agent":
					"Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/132.0.0.0 Safari/537.36",
			},
		}
	);

	function formatCryptoData(data) {
		return data.map((item) => ({
			hash: item.hash,
			age: moment(item.timestamp).fromNow(),
			date: new Date(item.timestamp).toISOString().split("T")[0],
			from: item.from,
			to: item.to,
			block: item.checkpoint.toString(),
			method: item.method,
			fiatBalance: item.usdValue || 0,
			amount: Number(item.amount).toFixed(6),
			txnFee: item.fee.toString(),
			gas: item.gas.toString(),
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
		const { data } = await axios.get(
			`${urlBase}/api/explorer/v1/sui/transactionDetail?txHash=${params.id}&t=${t}`,
			{
				httpsAgent: agent,
				headers: {
					"X-Apikey": get_ApiKey().getApiKey(),
					"User-Agent":
						"Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/132.0.0.0 Safari/537.36",
				},
			}
		);

		if (data.code == 404) {
			const error = new Error("transaction_not_found");
			error.status = 404;
			throw error;
		}
		const response = {
			hash: data.data.hash,
			status: data.data.status,
			block: data.data.height.toString(),
			timestamp: moment(data.data.timestamp).fromNow(),
			from: data.data.from,
			to: data.data.to,
			valueSUI: data.data.amount.toString(),
			valueDolar: "",
			transactionFeeDolar: data.data.computationCostFee.toString(),
			gasPrice: data.data.gasPrice.toString(),
		};

		return response;
	} catch (exception) {
		console.log(exception);
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
