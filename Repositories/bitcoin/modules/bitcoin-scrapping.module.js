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

// Obtener lista de transacciones
const getTransactionsList = async (params, query = { show: "25" }) => {
	const txsData = await makeApiRequest(
		`https://api.blockchain.info/haskoin-store/btc/address/${params.id}/transactions?limit=${query.show}&offset=0`
	);

	const txids = txsData.map((tx) => tx.txid).join(",");

	if (!txids.length) return { transactions: [] };

	const response = await makeApiRequest(
		`https://api.blockchain.info/haskoin-store/btc/transactions?txids=${txids}`
	);

	return { transactions: extractTransactionData(response) };
};

// Obtener detalles de una transacción específica
const getTransactionDetail = async (params) => {
	const data = await makeApiRequest(
		`https://api.blockchain.info/haskoin-store/btc/transaction/${params.id}`
	);

	return extractTransactionData(data);
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
						fiatBalance: (formatBTC * price).toString(),
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
		const toOutputs = tx.outputs.filter(
			(output) => output.address && output.address !== fromInput?.address
		);

		const amountSats = toOutputs.reduce((sum, output) => sum + output.value, 0);
		const amountBTC = amountSats / 1e8;

		return {
			hash: tx.txid,
			amount: amountBTC,
			amountSats: amountSats,
			from: fromInput?.address || null,
			to: toOutputs.map((output) => output.address),
			networkFee: tx.fee / 1e8,
			networkFeeSats: tx.fee,
			networkFeePayer: fromInput?.address || null,
			status: tx.block ? "confirmed" : "pending",
			blockNumber: tx.block?.height || null,
			logoURI: "https://cryptologos.cc/logos/bitcoin-btc-logo.png",
			tokenType: "coin",
			symbol: "BTC",
			decimals: 8,
		};
	});
}

const getTestnetTransactionsList = async (params, query = { show: "25" }) => {
	const txsData = await makeApiRequest(
		`https://blockstream.info/testnet/api/address/${params.id}/txs`
	);

	const txids = txsData.map((tx) => tx.txid).join(",");

	if (!txids.length) return { transactions: [] };

	return { transactions: extractTransactionData(txsData) };
};

const getTestnetBalance = async (params) => {
	try {
		const data = await makeApiRequest(
			`https://blockstream.info/testnet/api/address/${params.id}`
		);

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
						symbol: "tBTC",
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

module.exports = {
	getBalance,
	getTestnetBalance,
	getTestnetTransactionsList,
	getTransactionsList,
	getTransactionDetail,
};
