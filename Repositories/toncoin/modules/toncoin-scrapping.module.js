const axios = require("axios");
const moment = require("moment");
const { generateRandomUserAgent } = require("../../../Core/helpers");
const { get_ApiKey } = require("../../Solana/modules/oklink");
const explorerUrl = `https://viewblock.io/arweave/tx`;

// Crear instancia axios con timeout
const instance = axios.create({ timeout: 30000 });

// Crear instancia https que ignora certificados SSL inválidos
const https = require("https");
const { getTickerPrice } = require("../../binance/modules/binance.module");

const agent = new https.Agent({ rejectUnauthorized: false });

/**
 * Obtiene el balance de una dirección en Avalanche
 * @param {Object} params - Contiene el id (dirección)
 */
const getBalance = async (params) => {
	try {
		const { data } = await instance.get(
			`https://toncenter.com/api/v3/accountStates?address=${params.id}&include_boc=false`,

			{
				headers: { "user-agent": generateRandomUserAgent() },
			}
		);

		const priceTon = await instance.get(
			`https://api.ton.cat/v2/contracts/blockchain/market_stats`
		);

		return {
			address: params.id,
			fullName: "",
			balance: data.accounts[0].balance,
			_balance: Number(data.accounts[0].balance),
			fiatBalance: data.accounts[0].balance * priceTon.data.quotes.usd.price,
			account: {
				asset: "TON",
				fiatBalance: (
					data.accounts[0].balance * priceTon.data.quotes.usd.price
				).toString(),
				price: priceTon.data.quotes.usd.price,
			},
			tokenHoldings: {
				total: 0,
				balance: 0,
				tokens: [],
			},
			transactions: await getTransactionsList({ id: params.id, show: "10" }),
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
	const total = await instance.get(
		`https://cdn.routescan.io/api/blockchain/all/address/${params.id}?ecosystem=avalanche`,
		{
			headers: { "user-agent": generateRandomUserAgent() },
		}
	);

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
		_amount: parseFloat(
			(Number(token.balance) / 10 ** token.decimals).toFixed(12)
		),
		address: token.address,
	}));

	// Calcular balance total en moneda fiat
	const totalFiatBalance = formattedTokens.reduce(
		(sum, token) => sum + parseFloat(token.fiatBalance),
		0
	);

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
	const { id, show } = params;

	const url = `https://api.tonscan.com/api/bt/getTransactionsForAddress?address=${id}&limit=${show}`;

	const { data } = await axios.get(url, {
		headers: { "user-agent": generateRandomUserAgent() },
	});

	function formatData(data) {
		return data.reduce((acc, item) => {
			if (item.in.value !== null) {
				acc.push({
					block: item.in.seqno,
					hash: item.in.hash,
					from: item.in.from,
					to: item.in.to,
					method: "call",
					traffic: "IN",
					age: item.in.age,
					date: item.in.date,
					amount: item.in.value.toString(),
					//_amount: item.in.value,
					asset: "TON",
				});
			}

			if (item.out.length > 0) {
				acc.push({
					block: item.out[0].seqno,
					hash: item.out[0].hash,
					_hash: item.out[0]._hash,
					from: item.out[0].from,
					to: item.out[0].to,
					method: "call",
					traffic: "OUT",
					age: item.out[0].age,
					date: item.out[0].date,
					amount: item.out[0].value.toString(),
					//_amount: item.out[0].value,
					asset: "TON",
				});
			}

			return acc;
		}, []);
	}

	function extractFriendlyNameAndMessageType(transactions) {
		return transactions.map((tx) => ({
			in: {
				hash: tx.hash,
				_hash: encodeURIComponent(tx.hash),
				from: tx.in_msg?.source,
				to: tx.in_msg?.destination,
				message_type: tx.in_msg?.message_type || null,
				direction: tx.in_msg?.direction,
				age: moment(tx.in_msg?.utime * 1000).fromNow(),
				date: moment(tx.in_msg?.utime * 1000).format("YYYY-MM-DD HH:mm:ss"),
				value: tx.in_msg?.value || null,
			},
			out: tx.out_msgs.map((outMsg) => ({
				hash: tx.hash,
				_hash: encodeURIComponent(tx.hash),
				from: outMsg.source,
				to: outMsg.destination,
				message_type: outMsg.message_type || null,
				direction: outMsg.direction,
				age: moment(outMsg.utime * 1000).fromNow(),
				date: moment(outMsg.utime * 1000).format("YYYY-MM-DD HH:mm:ss"),
				value: outMsg.value || null,
			})),
		}));
	}

	return formatData(
		extractFriendlyNameAndMessageType(data.json.data.transactions)
	);
};

/**
 * Obtiene detalles de una transacción específica
 * @param {Object} params - Contiene el id (hash de la transacción)
 */
const getTransactionDetail = async (params) => {
	try {
		const { id } = params;

		const url = `https://api.tonscan.com/api/bt/getTransactionByHash?tx_hash=${encodeURIComponent(
			id
		)}`;

		const { data } = await axios.get(url, {
			headers: { "user-agent": generateRandomUserAgent() },
		});

		// const resp = {
		// 	hash: id,
		// 	status: data.data.status === "0x1" ? "Success" : "fail",
		// 	block: data.data.blockHeigh,
		// 	age: moment(data.data.blocktime * 1000).fromNow(),
		// 	date: moment(data.data.blocktime * 1000).format("YYYY-MM-DD HH:mm:ss"),
		// 	from: data.data.from,
		// 	to: data.data.to,
		// 	amount: data.data.value.toString(),
		// 	assetPrice: data.data.legalRate.toString(),
		// 	txnFee: data.data.fee.toString(),
		// 	gasPrice: data.data.gasPrice.toString(),
		// };
		return { transaction: data.json.data.detail };
	} catch (error) {
		console.log(error);
		return { transaction: [] };
	}
};

module.exports = {
	getBalance,
	getTransactionsList,
	getTransactionDetail,
	getTokens,
};
