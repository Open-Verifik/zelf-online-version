const { getCleanInstance } = require("../../../Core/axios");
const instance = getCleanInstance(30000);
const { generateRandomUserAgent } = require("../../../Core/helpers");

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

		return {
			address: params.id,
			balance: data.confirmed,
			fiatBalance: null, //data.balanceUsd,
			currency: "usd",
			account: {
				asset: "BTC",
				fiatValue: "0",
				price: data.confirmed,
			},
			tokenHoldings: {
				total: null,
				balance: null,
				tokens: [],
			},
		};
	} catch (error) {
		console.error({ error });
	}
};

/**
 * get transactions list
 * @param {Object} params
 * @returns
 */
const getTransactionsList = async (params, query) => {
	console.log(query.show);
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

module.exports = {
	getBalance,
	getTransactionsList,
	getTransactionDetail,
};
