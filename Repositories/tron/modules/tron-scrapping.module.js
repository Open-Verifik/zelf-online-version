const { getCleanInstance } = require("../../../Core/axios");
const instance = getCleanInstance(30000);
const { generateRandomUserAgent } = require("../../../Core/helpers");

/**
 * @param {*} params
 */

const getBalance = async (params) => {
	try {
		const { data } = await instance.get(
			`https://apilist.tronscanapi.com/api/accountv2?address=${params.id}`,
			{
				headers: {
					"user-agent": generateRandomUserAgent(),
				},
			}
		);

		const token = await instance.get(
			`https://apilist.tronscanapi.com/api/account/tokens?address=${params.id}&start=0&limit=20&token=&hidden=0&show=0&sortType=0&sortBy=0`,
			{
				headers: {
					"user-agent": generateRandomUserAgent(),
				},
			}
		);

		return {
			address: params.id,
			balance: data.balance,
			fiatBalance: null, //data.balanceUsd,
			currency: "usd",
			account: {
				asset: "TRX",
				fiatValue: "0",
				price: data.balanceUsd,
			},
			tokenHoldings: {
				total: token.data.total,
				balance: null,
				tokens: token.data.data,
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
	const { data } = await instance.get(
		`https://apilist.tronscanapi.com/api/transaction?sort=-timestamp&count=true&limit=${query.show}&start=${query.page}&address=${params.id}`,
		{
			headers: {
				"user-agent": generateRandomUserAgent(),
			},
		}
	);
	return { transactions: data.data };
};

/**
 * get transaction status
 * @param {Object} params
 */
const getToken = async (params, query) => {
	// const { data } = await instance.get(
	// 	//`https://minascan.io/mainnet/api/api/token/${params.id}/info`,
	// 	`https://api-v2.solscan.io/v2/account/tokens?address=${params.id}`,
	// 	{
	// 		headers: {
	// 			cookie:
	// 				"__cf_bm=6Nb_BhzZtOdGxVrRrnJoN83pN6rfOtlvuRxjI90nJ0E-1728040658-1.0.1.1-wWYmBJNnH55RvNIFlxo41XFAhHH4kt68pEvyR2fW2Zb_6hVNARhlKxBPCqoZQ_ZhtRQjCeFp6vReppgZbEYgbw; cf_clearance=ibbR6Iox6IDDq4r5WTmuKO0tkKPcwv8GloL.CCp7V3w-1728040665-1.2.1.1-Ef84Taqzk5aSmCiHV321WYtxUv7EIDJTG0SDgp4J.kjIs6gG9J7GVpSV9HE12tuH7xN5vtzdNt1sm6dOee1c20DQO2Lqd.rymeTv.0g340.1jEjK1BnkO4QUlkmEWdbBHzBOc43akGgAef7InJnNEKcg2eO5dPLXT0waBuDCHTs1VMJWBHhfeAE9jZz4C.pPKJKtUDvCyqvR.KRlokRlHo_gnzTVUQDawAtgdLimOOWAK5huvgGQURDoHngS1E5ne03ScjMqfL9HGKME7wXjsK1M9v6zX0WjGMiRDiXkMX3H8oZieb0wyG.j.UKR7jS3K9ElZYtMaZ2kTH1dRJ2DW13.4Q.H3Q.RZlc7Bv3a9FEKf79.2TUxXaiGtKqFH9IbCrPVxFCQ09YxgSp_U0H0AA; _ga=GA1.1.1401977830.1728040664; _ga_PS3V7B7KV0=GS1.1.1728040664.1.1.1728040689.0.0.0; __cf_bm=Mz6cAvTNjPAeUi30bGhjWOHzNal5QLqwS2T6omWu3c8-1728267695-1.0.1.1-oPl.fRzgy_UIvX86I4hXorbEOT5HKcOEAxcTsfbsYnUgtBpIH.Cck88Gm0KcosZyt6sRto_BNTjyJegI2oYryQ",
	// 			"if-none-match": 'W/"622-Ukdydv8vKaxhKj3QjdlU5A1PS9k"',
	// 			origin: "https://solscan.io",
	// 			priority: "u=1, i",
	// 			referer: "https://solscan.io/",
	// 			"sol-aut": "uommLFJFHe0I=7pB9dls0fKSHLSixPco",
	// 			"user-agent": generateRandomUserAgent(),
	// 		},
	// 	}
	// );
	// return { tokens: data.data.tokens };
};

module.exports = {
	getBalance,
	getTransactionsList,
	getToken,
};
