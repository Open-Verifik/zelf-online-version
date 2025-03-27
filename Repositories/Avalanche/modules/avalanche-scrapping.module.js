const axios = require("axios");
const moment = require("moment");
const { generateRandomUserAgent } = require("../../../Core/helpers");
const { get_ApiKey } = require("../../Solana/modules/oklink");

// Crear instancia axios con timeout
const instance = axios.create({ timeout: 30000 });

// Crear instancia https que ignora certificados SSL inválidos
const https = require("https");
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
		const transactions = await getTransactionsList({ id: params.id }, { page: "0", show: "100" });

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
			...transactions,
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
const getTransactionsList = async (params, query) => {
	const t = Date.now();

	const { data } = await axios.get(
		`https://www.oklink.com/api/explorer/v2/avaxc/addresses/${params.id}/transactionsByClassfy/condition?offset=${query.page || 1}&limit=${
			query.show || 20
		}&address=${params.id}&nonzeroValue=false&t=${t}`,
		{
			httpsAgent: agent,
			headers: {
				"X-Apikey": get_ApiKey().getApiKey(),
				"User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/132.0.0.0 Safari/537.36",
			},
		}
	);

	// Determinar el activo basado en el método
	const getAsset = (method) => (method.includes("AVAX") ? "AVAX" : "ETH");

	// Formatear transacciones
	const transactions = data.data.hits.map((tx) => ({
		hash: tx.hash,
		method: tx.method === "swap" ? "Swap" : tx.method,
		block: tx.blockHeight.toString(),
		age: moment(tx.blocktime * 1000).fromNow(),
		from: tx.from,
		traffic: tx.realValue < 0 ? "OUT" : "IN",
		to: tx.to,
		amount: tx.value.toFixed(4),
		asset: "AVAX",
		txnFee: tx.fee.toFixed(4),
	}));

	return { transactions };
};

/**
 * Obtiene detalles de una transacción específica
 * @param {Object} params - Contiene el id (hash de la transacción)
 */
const getTransactionDetail = async (params) => {
	const { data } = await instance.get(`https://api.blockchain.info/haskoin-store/btc/transaction/${params.id}`, {
		headers: { "user-agent": generateRandomUserAgent() },
	});

	return { transactionDetail: data };
};

module.exports = {
	getBalance,
	getTransactionsList,
	getTransactionDetail,
	getTokens,
};
