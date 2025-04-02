const { getCleanInstance } = require("../../../Core/axios");
const { generateRandomUserAgent } = require("../../../Core/helpers");
const { getTickerPrice } = require("../../binance/modules/binance.module");

const instance = getCleanInstance(30000);
const SATOSHI_TO_BTC = 100000000;

// Función para realizar solicitudes a la API con el User-Agent generado aleatoriamente
const makeApiRequest = async (url) => {
	try {
		const { data } = await instance.get(url, {
			headers: {
				"user-agent": generateRandomUserAgent(),
			},
		});
		return data;
	} catch (error) {
		console.error("API Request Error:", error);
		throw error;
	}
};

// Convertir valores de satoshis a BTC
const convertSatoshiToBTC = (satoshi) => satoshi / SATOSHI_TO_BTC;

// Convertir valores en transacciones a formato extendido
const convertTransactionValues = (transactions) => {
	if (!Array.isArray(transactions)) {
		transactions = [transactions];
	}

	return transactions.map((tx) => ({
		...tx,
		fee_satoshis: tx.fee,
		fee_btc: convertSatoshiToBTC(tx.fee),
		inputs: tx.inputs.map((input) => ({
			...input,
			value_satoshis: input.value,
			value_btc: convertSatoshiToBTC(input.value),
		})),
		outputs: tx.outputs.map((output) => ({
			...output,
			value_satoshis: output.value,
			value_btc: convertSatoshiToBTC(output.value),
		})),
	}));
};

// Obtener lista de transacciones
const getTransactionsList = async (params, query = { show: "25" }) => {
	const txsData = await makeApiRequest(
		`https://api.blockchain.info/haskoin-store/btc/address/${params.id}/transactions?limit=${query.show}&offset=0`
	);

	const txids = txsData.map((tx) => tx.txid).join(",");

	const response = await makeApiRequest(
		`https://api.blockchain.info/haskoin-store/btc/transactions?txids=${txids}`
	);

	return { transactions: convertTransactionValues(response) };
};

// Obtener detalles de una transacción específica
const getTransactionDetail = async (params) => {
	const data = await makeApiRequest(
		`https://api.blockchain.info/haskoin-store/btc/transaction/${params.id}`
	);

	return convertTransactionValues(data)[0];
};

// Obtener balance de una dirección
const getBalance = async (params) => {
	try {
		const data = await makeApiRequest(
			`https://api.blockchain.info/haskoin-store/btc/address/${params.id}/balance`
		);

		const { price } = await getTickerPrice({ symbol: "BTC" });
		const formatBTC = convertSatoshiToBTC(data.confirmed);

		const { transactions } = await getTransactionsList({ id: params.id });

		return {
			address: params.id,
			fullName: "not_available",
			balance: formatBTC.toString(),
			fiatBalance: formatBTC * price,
			account: {
				asset: "BTC",
				fiatBalance: (formatBTC * price).toString(),
				price: price,
			},
			tokenHoldings: {
				total: 0,
				balance: 0,
				tokens: [],
			},
			transactions: transactions,
		};
	} catch (e) {
		const error = new Error("not_found");
		error.status = 404;
		throw error;
	}
};

module.exports = {
	getBalance,
	getTransactionsList,
	getTransactionDetail,
};
