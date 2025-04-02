const axios = require("axios");
const moment = require("moment");
const { generateRandomUserAgent } = require("../../../Core/helpers");
const { get_ApiKey } = require("../../Solana/modules/oklink");

// Crear instancia axios con timeout
const instance = axios.create({ timeout: 30000 });

// Crear instancia https que ignora certificados SSL inválidos
const https = require("https");
const { hash } = require("crypto");
const { fail } = require("assert");
const agent = new https.Agent({ rejectUnauthorized: false });

/**
 * Obtiene el balance de una dirección en Avalanche
 * @param {Object} params - Contiene el id (dirección)
 */
const getBalance = async (params) => {
	try {
		// Obtener balance nativo
		const { data } = await instance.get(`https://glacier-api.avax.network/v1/chains/43114/addresses/${params.id}/balances:getNative`, {
			headers: { "user-agent": generateRandomUserAgent() },
		});

		// Obtener tokens y transacciones
		const tokenHoldings = await getTokens({ id: params.id }, { show: "200" });

		const transactions = await getTransactionsList({
			id: params.id,
			page: "0",
			show: "100",
		});

		return {
			address: params.id,
			image: data.nativeTokenBalance.logoUri,
			balance: (Number(data.nativeTokenBalance.balance) / 10 ** data.nativeTokenBalance.decimals).toFixed(data.nativeTokenBalance.decimals),
			_balance: parseFloat(
				(Number(data.nativeTokenBalance.balance) / 10 ** data.nativeTokenBalance.decimals).toFixed(data.nativeTokenBalance.decimals)
			),
			fiatBalance: data.nativeTokenBalance?.balanceValue?.value || 0,
			decimals: data.nativeTokenBalance.decimals,
			account: {
				asset: "AVAX",
				fiatBalance: data.nativeTokenBalance?.balanceValue?.value.toString(),
				price: data.nativeTokenBalance?.price?.value.toString(),
			},
			tokenHoldings,
			transactions,
		};
	} catch (error) {
		console.error({ error });
	}
};

/**
 * Obtiene los tokens ERC20 de una dirección
 * @param {Object} params - Contiene el id (dirección)
 * @param {Object} query - Parámetros adicionales
 */
const getTokens = async (params, query) => {
	// Obtener tokens ERC20
	const { data } = await instance.get(
		`https://glacier-api.avax.network/v1/chains/43114/addresses/${params.id}/balances:listErc20?pageSize=100&filterSpamTokens=true`,
		{ headers: { "user-agent": generateRandomUserAgent() } }
	);

	// Obtener conteo total de tokens
	const total = await instance.get(`https://cdn.routescan.io/api/blockchain/all/address/${params.id}?ecosystem=avalanche`, {
		headers: { "user-agent": generateRandomUserAgent() },
	});

	const erc20Count = total.data.erc20Count;
	const erc721Count = total.data.erc721Count;
	const erc1155Count = total.data.erc1155Count;

	// Formatear datos de tokens
	const formattedTokens = data.erc20TokenBalances.map((token) => ({
		tokenType: token.ercType,
		fiatBalance: token.balanceValue?.value || 0,
		_fiatBalance: token.balanceValue?.value.toString(),
		symbol: token.symbol,
		name: token.name,
		price: token.price?.value?.toString() || "0",
		_price: token.price?.value,
		image: token.logoUri,
		decimals: token.decimals,
		amount: (Number(token.balance) / 10 ** token.decimals).toFixed(12),
		_amount: parseFloat((Number(token.balance) / 10 ** token.decimals).toFixed(12)),
		address: token.address,
	}));

	// Calcular balance total en moneda fiat
	const totalFiatBalance = formattedTokens.reduce((sum, token) => sum + parseFloat(token.fiatBalance), 0);

	return {
		balance: totalFiatBalance.toString(),
		total: erc20Count + erc721Count + erc1155Count,
		tokens: formattedTokens,
	};
};

/**
 * Obtiene las transacciones de una dirección
 * @param {Object} params - Contiene el id (dirección)
 * @param {Object} query - Parámetros de paginación
 */
const getTransactionsList = async (params) => {
	const t = Date.now();

	const { id, page, show } = params;

	const url = `https://www.oklink.com/api/explorer/v2/avaxc/addresses/${id}/transactionsByClassfy/condition?offset=${page || "0"}&limit=${
		show || "100"
	}&address=${id}&nonzeroValue=false&t=${t}`;

	const { data } = await axios.get(url, {
		httpsAgent: agent,
		headers: {
			"X-Apikey": get_ApiKey().getApiKey(),
			"User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/132.0.0.0 Safari/537.36",
		},
	});

	// Formatear transacciones
	const transactions = data.data.hits.map((tx) => ({
		hash: tx.hash,
		method: tx.method === "swap" ? "Swap" : tx.method,
		block: tx.blockHeight.toString(),
		age: moment(tx.blocktime * 1000).fromNow(),
		date: moment(tx.blocktime * 1000),
		from: tx.from,
		traffic: tx.realValue < 0 ? "OUT" : "IN",
		to: tx.to,
		amount: tx.value.toFixed(4),
		asset: "AVAX",
		txnFee: tx.fee.toFixed(4),
	}));

	return transactions;
};

/**
 * Obtiene detalles de una transacción específica
 * @param {Object} params - Contiene el id (hash de la transacción)
 */
const getTransactionDetail = async (params) => {
	try {
		const t = Date.now();

		const { id } = params;

		const url = `https://www.oklink.com/api/explorer/v1/avaxc/transactions/${id}?t=${t}`;

		const { data } = await axios.get(url, {
			httpsAgent: agent,
			headers: {
				"X-Apikey": get_ApiKey().getApiKey(),
				"User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/132.0.0.0 Safari/537.36",
			},
		});

		const transaction = {
			hash: id,
			status: data.data.status === "0x1" ? "Success" : "fail",
			block: data.data.blockHeigh,
			age: moment(data.data.blocktime * 1000).fromNow(),
			date: moment(data.data.blocktime * 1000).format("YYYY-MM-DD HH:mm:ss"),
			from: data.data.from,
			to: data.data.to,
			amount: data.data.value.toString(),
			assetPrice: data.data.legalRate.toString(),
			txnFee: data.data.fee.toString(),
			gasPrice: data.data.gasPrice.toString(),
		};
		return transaction;
	} catch (error) {
		return transaction;
	}
};

module.exports = {
	getBalance,
	getTransactionsList,
	getTransactionDetail,
	getTokens,
};
