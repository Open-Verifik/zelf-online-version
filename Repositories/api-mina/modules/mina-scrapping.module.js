const { getCleanInstance } = require("../../../Core/axios");
const instance = getCleanInstance(30000);
const { generateRandomUserAgent } = require("../../../Core/helpers");

/**
 * @param {*} params
 */

const getBalance = async (params) => {
	try {
		const { data } = await instance.get(`https://minascan.io/mainnet/api/api/core/accounts/${params.id}/balance`, {
			headers: {
				"user-agent": generateRandomUserAgent(),
				"Upgrade-Insecure-Requests": "1",
			},
		});

		return {
			address: params.id,
			balance: data.balance,
			fiatBalance: null, //data.balanceUsd,
			currency: "usd",
			account: {
				asset: "MINA",
				fiatValue: "0",
				price: data.balanceUsd,
			},
			tokenHoldings: {
				total: null,
				balance: null,
				tokens: [],
			},
		};
	} catch (error) {
		console.error({ error: error.response.data });
	}
};

/**
 * get transactions list
 * @param {Object} params
 * @returns
 */
const getTransactionsList = async (params, query) => {
	const { data } = await instance.get(
		`https://minascan.io/mainnet/api/api/core/accounts/${params.id}/activity?page=${query.page}&limit=${query.show}&sortBy=age&orderBy=DESC&direction=all`,
		{
			headers: {
				"user-agent": generateRandomUserAgent(),
				"Upgrade-Insecure-Requests": "1",
			},
		}
	);
	return data.data;
};

/**
 * get transaction status
 * @param {Object} params
 */
const getToken = async (params, query) => {
	const { data } = await instance.get(`https://minascan.io/mainnet/api/api/token/${params.id}/info`, {
		headers: {
			"user-agent": generateRandomUserAgent(),
			"Upgrade-Insecure-Requests": "1",
		},
	});

	return data;
};

module.exports = {
	getBalance,
	getTransactionsList,
	getToken,
};
