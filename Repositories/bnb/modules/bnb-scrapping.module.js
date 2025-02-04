const { getCleanInstance } = require("../../../Core/axios");
const instance = getCleanInstance(30000);
const { generateRandomUserAgent } = require("../../../Core/helpers");
const endpoint = `https://api-v2.solscan.io/v2`;

/**
 * @param {*} params
 */

const getAddress = async (params) => {
	try {
		const { data } = await instance.get(`https://api.xrpscan.com/api/v1/account/${params.id}`, {
			headers: {
				"user-agent": generateRandomUserAgent(),
			},
		});

		const _response = {
			address: params.id,
			balance: data.Balance / 1_000_000_000,
			type: "", //result.type,
			fiatBalance: 0,
			account: {
				asset: "XRP",
				fiatValue: "0",
				price: "0",
			},
			tokenHoldings: null,
		};

		_response.tokenHoldings = await getTokens(`${params.id}`);

		if (_response.tokenHoldings.balance) _response.fiatBalance += _response.tokenHoldings.balance;

		return _response;
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
	const { data } = await instance.get(`https://api.xrpscan.com/api/v1/account/${params.id}/transactions`, {
		headers: {
			"user-agent": generateRandomUserAgent(),
		},
	});
	return { transactions: data };
};

/**
 * get transaction status
 * @param {Object} params
 */
const getTokens = async (params) => {
	const { data } = await instance.get(`https://api.xrpscan.com/api/v1/account/${params}/assets`, {
		headers: {
			"user-agent": generateRandomUserAgent(),
		},
	});

	const tokenHoldings = {
		total: data.length,
		balance: 0,
		fiatBalance: 0,
		tokens: [],
	};

	try {
		for (let index = 0; index < data.length; index++) {
			const token = data[index];

			tokenHoldings.fiatBalance += token.value;

			tokenHoldings.tokens.push({
				fiatBalance: token.value,
				counterparty: token.counterparty,
				currency: token.currency,
			});
		}
	} catch (exception) {
		console.error({ exception });
	}

	return tokenHoldings;
};

module.exports = {
	getAddress,
	getTransactionsList,
	getTokens,
};
