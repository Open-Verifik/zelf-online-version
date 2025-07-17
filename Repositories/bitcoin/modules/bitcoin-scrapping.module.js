const { getCleanInstance } = require("../../../Core/axios");
const { generateRandomUserAgent } = require("../../../Core/helpers");
const { getTickerPrice } = require("../../binance/modules/binance.module");
const moment = require("moment");
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
		date: tx.time,
		fee_btc: convertSatoshiToBTC(tx.fee),
		fee_satoshis: tx.fee,
		hash: tx.txid,
		network: "bitcoin",
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

	if (!txids.length) return { transactions: [] };

	const response = await makeApiRequest(`https://api.blockchain.info/haskoin-store/btc/transactions?txids=${txids}`);
	const userAddress = params.id;
	return { transactions: await extractTransactionData(response, userAddress) };
};

// Obtener detalles de una transacción específica
const getTransactionDetail = async (params) => {
	const data = await makeApiRequest(`https://api.blockchain.info/haskoin-store/btc/transaction/${params.id}`);

	return extractTransactionData([data]);
};

// Obtener balance de una dirección
const getBalance = async (params) => {
	try {
		const data = await makeApiRequest(`https://api.blockchain.info/haskoin-store/btc/address/${params.id}/balance`);

		const { price } = await getTickerPrice({ symbol: "BTC" });
		const formatBTC = convertSatoshiToBTC(data.confirmed);

		const { transactions } = await getTransactionsList({ id: params.id });

		return {
			address: params.id,
			balance: formatBTC.toString(),
			fiatBalance: formatBTC * price,
			fullName: "BTC",
			account: {
				asset: "BTC",
				fiatBalance: (formatBTC * price).toString(),
				price: price,
			},
			tokenHoldings: {
				balance: formatBTC,
				total: formatBTC,
				tokens: [
					{
						address: params.id,
						amount: formatBTC.toString(),
						decimals: 8,
						fiatBalance: formatBTC * price,
						image: "https://static.okx.com/cdn/wallet/logo/BTC.png",
						name: "Bitcoin",
						network: "Bitcoin",
						price: price,
						symbol: "BTC",
						tokenType: "BTC",
					},
				],
			},
			transactions,
		};
	} catch (e) {
		const error = new Error("not_found");
		error.status = 404;
		throw error;
	}
};

function extractTransactionData(transactions) {
	return transactions.map((tx) => {
		const fromInput = tx.inputs.find((input) => input.address);
		const toOutputs = tx.outputs.filter((output) => output.address && output.address !== fromInput?.address);

		const amountSats = toOutputs.reduce((sum, output) => sum + output.value, 0);
		const amountBTC = amountSats / 1e8;

		return {
			amount: amountBTC,
			amountSats: amountSats,
			blockNumber: tx.block?.height || null,
			decimals: 8,
			from: fromInput?.address || null,
			hash: tx.txid,
			logoURI: "https://cryptologos.cc/logos/bitcoin-btc-logo.png",
			networkFee: tx.fee / 1e8,
			networkFeePayer: fromInput?.address || null,
			networkFeeSats: tx.fee,
			status: tx.block ? "confirmed" : "pending",
			symbol: "BTC",
			to: toOutputs.map((output) => output.address),
			tokenType: "coin",
		};
	});
}

const getTestnetTransactionsList = async (params, query = { show: "25" }) => {
	const txsData = await makeApiRequest(`https://blockstream.info/testnet/api/address/${params.id}/txs`);

	const txids = txsData.map((tx) => tx.txid).join(",");

	if (!txids.length) return { transactions: [] };

	return { transactions: extractTransactionData(txsData) };
};

const getTestnetBalance = async (params) => {
	try {
		const data = await makeApiRequest(`https://blockstream.info/testnet/api/address/${params.id}`);

		const { price } = await getTickerPrice({ symbol: "BTC" });
		const formatBTC = convertSatoshiToBTC(data.chain_stats.funded_txo_sum);

		const { transactions } = await getTestnetTransactionsList(params);

		return {
			address: params.id,
			balance: formatBTC.toString(),
			fiatBalance: formatBTC * price,
			fullName: "Testnet BTC",
			account: {
				asset: "tBTC",
				fiatBalance: (formatBTC * price).toString(),
				price: price,
			},
			tokenHoldings: {
				balance: formatBTC,
				total: formatBTC,
				tokens: [
					{
						address: params.id,
						amount: formatBTC.toString(),
						decimals: 8,
						fiatBalance: (formatBTC * price).toString(),
						image: "https://static.okx.com/cdn/wallet/logo/tbtc_21300.png",
						name: "Testnet Bitcoin",
						network: "Bitcoin",
						price: price,
						symbol: "BTC",
						tokenType: "BTC",
					},
				],
			},
			transactions,
		};
	} catch (e) {
		const error = new Error("not_found");
		error.status = 404;
		throw error;
	}
};

function analizarTransaccion(tx, direccionPropia) {
	let totalEntrada = 0;
	let totalSalida = 0;
	let salidaPropia = 0;
	let entradaPropia = 0;

	// Entradas (inputs)
	tx.inputs.forEach((input) => {
		if (input.address === direccionPropia) {
			entradaPropia += input.value_satoshis;
		}
		totalEntrada += input.value_satoshis;
	});

	// Salidas (outputs)
	tx.outputs.forEach((output) => {
		// Algunos outputs como OP_RETURN no tienen dirección
		if (output.address === direccionPropia) {
			salidaPropia += output.value_satoshis;
		}
		totalSalida += output.value_satoshis;
	});

	const fueEnviada = entradaPropia > 0;
	const fueRecibida = salidaPropia > entradaPropia;

	const resultado = {
		direccion: direccionPropia,
		tipo: "",
		enviado: entradaPropia,
		recibido: salidaPropia,
		totalEntrada,
		totalSalida,
		fee: tx.fee_satoshis || totalEntrada - totalSalida,
	};

	if (fueEnviada && !fueRecibida) {
		resultado.tipo = "enviada";
	} else if (!fueEnviada && fueRecibida) {
		resultado.tipo = "recibida";
	} else if (fueEnviada && fueRecibida) {
		resultado.tipo = "mixta";
	} else {
		resultado.tipo = "irrelevante";
	}

	return resultado;
}

async function extractTransactionData(transactions, userAddress) {
	const { price: btcPrice } = await getTickerPrice({ symbol: "BTC" });

	if (!btcPrice) throw new Error("Could not retrieve BTC price");

	return transactions.map((tx) => {
		const fromInput = tx.inputs.find((input) => input.address);
		const toOutputs = tx.outputs.filter((output) => output.address && output.address !== fromInput?.address);

		const amountSats = toOutputs.reduce((sum, output) => sum + output.value, 0);
		const amountBTC = amountSats / 1e8;
		const fiatAmount = amountBTC * btcPrice;

		const txMoment = moment.unix(tx.time);
		const isOutgoing = tx.inputs.some((input) => input.address === userAddress);
		const isIncoming = tx.outputs.some((output) => output.address === userAddress);

		let traffic = "OUT";

		if (!isOutgoing && isIncoming) traffic = "IN";
		if (isOutgoing && isIncoming) traffic = "OUT";

		return {
			age: txMoment.fromNow(),
			amount: amountBTC.toString(),
			amountSats: amountSats,
			asset: "BTC",
			block: tx.block?.height?.toString() || "",
			date: txMoment.format("YYYY-MM-DD HH:mm:ss"),
			decimals: 8,
			fiatAmount: fiatAmount.toFixed(2),
			from: fromInput?.address || "",
			hash: tx.txid,
			logoURI: "https://cryptologos.cc/logos/bitcoin-btc-logo.png",
			networkFeePayer: fromInput?.address || "",
			status: tx.block.height ? "Success" : "Pending",
			to: toOutputs.map((output) => output.address),
			traffic,
			txnFee: (tx.fee / 1e8).toString(),
			txnFeeSats: tx.fee.toString(),
		};
	});
}

module.exports = {
	getBalance,
	getTestnetBalance,
	getTestnetTransactionsList,
	getTransactionsList,
	getTransactionDetail,
};
