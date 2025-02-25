const { getCleanInstance } = require("../../../Core/axios");
const instance = getCleanInstance(30000);
const { generateRandomUserAgent } = require("../../../Core/helpers");
const { getTickerPrice } = require("../../binance/modules/binance.module");
const formatterClass = require("../../class/data-formatterClass");
const formatterNumberClass = require("../../class/data-formatterNumberClass");
/**
 * @param {*} params
 */

const getBalance = async (params) => {
	try {
		const { data } = await instance.get(
			`https://api.blockchain.info/haskoin-store/btc/address/${params.id}/balance`,
			{
				headers: {
					"user-agent": generateRandomUserAgent(),
				},
			}
		);

		const { price } = await getTickerPrice({ symbol: "BTC" });

		const formatBTC = data.confirmed / 10_000_000;

		const { transactions } = await getTransactionsList(
			{ id: params.id },
			{ show: "25" }
		);

		return {
			address: params.id,
			fullName: "not_available",
			balance: formatBTC.toString(),
			fiatBalance: formatBTC * price,
			//currency: "USD",
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
			transactions: formatTransactionData(transactions),
		};
	} catch (error) {
		console.error({ error });
	}
};

function formatTransactionData(transactions) {
	return transactions.map((tx) => {
		return {
			blockHeight: tx.block.height,
			blockPosition: tx.block.position,
			hash: tx.txid,
		};
	});
}
/**
 * get transactions list
 * @param {Object} params
 * @returns
 */
const getTransactionsList = async (params, query) => {
	const { data } = await instance.get(
		`https://api.blockchain.info/haskoin-store/btc/address/${params.id}/transactions?limit=${query.show}&offset=0`,
		{
			headers: {
				"user-agent": generateRandomUserAgent(),
			},
		}
	);
	return { transactions: data };
};

/**
 * get transaction status
 * @param {Object} params
 */
const getTransactionDetail = async (params, query) => {
	const { data } = await instance.get(
		`https://api.blockchain.info/haskoin-store/btc/transaction/${params.id}`,
		{
			headers: {
				"user-agent": generateRandomUserAgent(),
			},
		}
	);

	return { transactionDetail: data };
};
const formatData = (data) => {
	const forma = new formatterClass(data);

	const translated = forma.translateKeys();

	return translated;
};
const formatNumber = (data) => {
	const formattedData = formatterNumberClass.formatData(data);

	return formattedData;
};

module.exports = {
	getBalance,
	getTransactionsList,
	getTransactionDetail,
};
