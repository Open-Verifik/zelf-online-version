const cheerio = require("cheerio");
const { getCleanInstance } = require("../../../Core/axios");
const axios = require("axios");
const https = require("https");

const agent = new https.Agent({
	rejectUnauthorized: false,
});
const instance = getCleanInstance(30000);
const { generateRandomUserAgent } = require("../../../Core/helpers");
const { solana } = require("../../../Core/config");
const endpoint = `https://api-v2.solscan.io/v2`;

/**
 * @param {*} params
 */

const getAddress = async (params) => {
	try {
		const address = params.id;
		const response = await axios.get(
			`https://www.oklink.com/es-la/sol/account/${address}`,

			{ httpsAgent: agent }
		);
		//console.log(response.data);
		const $ = cheerio.load(response.data);

		const balanceUSD = $(
			"#root > main > div > div.single-pannel > div.index_infoWrapper__4GvU6 > div:nth-child(1) > div:nth-child(2) > div.index_value__vVl9q > span > div"
		).text();

		console.log({ balanceUSD });

		const balance = $(
			"#root > main > div > div.single-pannel > div.index_infoWrapper__4GvU6 > div:nth-child(1) > div:nth-child(3) > div.index_value__vVl9q > div > span.inline-flex.align-items-center.max-w-100.overflow-hidden > div > div"
		).text();
		console.log({ balance });

		const SaldoSOL_USD = $(
			"#root > main > div > div.single-pannel > div.index_infoWrapper__4GvU6 > div:nth-child(1) > div:nth-child(3) > div.index_value__vVl9q > div > span.index_usdValue__M2TO1 > div > div"
		)
			.text()
			.split("$")[1];
		console.log({ balance });

		// const traceId = response.headers["set-cookie"][0].split("path=/")[0].trim();
		// const devId = response.headers["set-cookie"][1].split("path=/")[0].trim();
		// const ok_site_info = response.headers["set-cookie"][2]
		// 	.split("path=/")[0]
		// 	.trim();
		// const locale = response.headers["set-cookie"][3].split("path=/")[0].trim();
		// const ok_exp_time = response.headers["set-cookie"][4]
		// 	.split("path=/")[0]
		// 	.trim();
		// const __cf_bm = response.headers["set-cookie"][5].split("path=/")[0].trim();

		// const coookie = `${traceId} ${devId} ${ok_site_info} ${traceId} ${locale} ${ok_exp_time} ${__cf_bm}`;

		// console.log({ coookie });
		// const t = Date.now();
		// console.log({ t });

		// //console.log(`${devId.replace("devId=", "")}`);

		// console.log(get_ApiKey().getApiKey());

		// const token = await axios.get(
		// 	`https://www.oklink.com/api/explorer/v2/sol/transaction/2TFytXE94RdCQcKYzXLRxZHK2ey46Kn5p9RF56adZE1y?offset=0&limit=20&address=2TFytXE94RdCQcKYzXLRxZHK2ey46Kn5p9RF56adZE1y&chain=solana&t=${t}`,
		// 	{
		// 		httpsAgent: agent,
		// 		headers: {
		// 			// Cookie: coookie,
		// 			// Devid: `${devId.replace("devId=", "")}`,
		// 			"X-Apikey": get_ApiKey().getApiKey(),
		// 			"User-Agent":
		// 				"Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/132.0.0.0 Safari/537.36",
		// 			//"Ok-Verify-Token": "b30b27e7-a515-49cf-b095-96b50b0a45df",
		// 		},
		// 	}
		// );
		// console.log(token.data.data);

		// const price_usdt = await instance.get(
		// 	`${endpoint}/account/domain?address=${params.id}`,
		// 	{
		// 		headers: {
		// 			cookie:
		// 				"__cf_bm=6Nb_BhzZtOdGxVrRrnJoN83pN6rfOtlvuRxjI90nJ0E-1728040658-1.0.1.1-wWYmBJNnH55RvNIFlxo41XFAhHH4kt68pEvyR2fW2Zb_6hVNARhlKxBPCqoZQ_ZhtRQjCeFp6vReppgZbEYgbw; cf_clearance=ibbR6Iox6IDDq4r5WTmuKO0tkKPcwv8GloL.CCp7V3w-1728040665-1.2.1.1-Ef84Taqzk5aSmCiHV321WYtxUv7EIDJTG0SDgp4J.kjIs6gG9J7GVpSV9HE12tuH7xN5vtzdNt1sm6dOee1c20DQO2Lqd.rymeTv.0g340.1jEjK1BnkO4QUlkmEWdbBHzBOc43akGgAef7InJnNEKcg2eO5dPLXT0waBuDCHTs1VMJWBHhfeAE9jZz4C.pPKJKtUDvCyqvR.KRlokRlHo_gnzTVUQDawAtgdLimOOWAK5huvgGQURDoHngS1E5ne03ScjMqfL9HGKME7wXjsK1M9v6zX0WjGMiRDiXkMX3H8oZieb0wyG.j.UKR7jS3K9ElZYtMaZ2kTH1dRJ2DW13.4Q.H3Q.RZlc7Bv3a9FEKf79.2TUxXaiGtKqFH9IbCrPVxFCQ09YxgSp_U0H0AA; _ga=GA1.1.1401977830.1728040664; _ga_PS3V7B7KV0=GS1.1.1728040664.1.1.1728040689.0.0.0; __cf_bm=Mz6cAvTNjPAeUi30bGhjWOHzNal5QLqwS2T6omWu3c8-1728267695-1.0.1.1-oPl.fRzgy_UIvX86I4hXorbEOT5HKcOEAxcTsfbsYnUgtBpIH.Cck88Gm0KcosZyt6sRto_BNTjyJegI2oYryQ",
		// 			"if-none-match": 'W/"622-Ukdydv8vKaxhKj3QjdlU5A1PS9k"',
		// 			origin: "https://solscan.io",
		// 			priority: "u=1, i",
		// 			referer: "https://solscan.io/",
		// 			"sol-aut": "5GvLD-NW7B9dls0fKbJHWeJeCUXOPQAbf70dKwfI:",
		// 			"user-agent": generateRandomUserAgent(),
		// 		},
		// 	}
		// );

		// const result = data.data;
		// const { transactions } = await getTransactionsList(
		// 	{ id: params.id },
		// 	{
		// 		show: "10",
		// 	}
		// );
		// const _response = {
		// 	address: result.account,
		// 	balance: result.lamports / 1_000_000_000 || 0,
		// 	type: result.type,
		// 	account: {
		// 		asset: "SOL",
		// 		fiatValue: "0",
		// 		price:
		// 			price_usdt.data.metadata.tokens
		// 				.So11111111111111111111111111111111111111112.price_usdt,
		// 	},
		// 	tokenHoldings: null,

		// 	solanaTransactions: transactions,
		// };

		// if (_response) {
		// 	_response.fiatBalance = (
		// 		_response.balance * _response.account.price
		// 	).toFixed(5);

		// 	_response.account.fiatValue = (
		// 		_response.balance * _response.account.price
		// 	).toFixed(5);
		// }

		// _response.tokenHoldings = await getTokens({ id: params.id });

		// _response.tokenHoldings.tokens.unshift({
		// 	tokenType: "SOL",
		// 	fiatBalance: _response.fiatBalance,
		// 	symbol: "SOL",
		// 	name: "Solana",
		// 	price: _response.account.price,
		// 	amount: _response.balance,
		// 	image:
		// 		"https://vtxz26svcpnbg5ncfansdb5zt33ec2bwco6uuah3g3sow3pewfma.arweave.zelf.world/rO-delUT2hN1oigbIYe5nvZBaDYTvUoA-zbk623ksVg",
		// });

		// if (_response.tokenHoldings.balance)
		// 	_response.fiatBalance += _response.tokenHoldings.balance;

		return {
			address,
			balance: balance || 0,
			type: "system_account",
			account: {
				asset: "SOL",
				fiatValue: SaldoSOL_USD || 0,
				price: "" || 0,
			},
			tokenHoldings: await getTokens({ id: address }),
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
	const t = Date.now();

	console.log(get_ApiKey().getApiKey());

	const token = await axios.get(
		`https://www.oklink.com/api/explorer/v2/sol/transaction/2TFytXE94RdCQcKYzXLRxZHK2ey46Kn5p9RF56adZE1y?offset=0&limit=20&address=2TFytXE94RdCQcKYzXLRxZHK2ey46Kn5p9RF56adZE1y&chain=solana&t=${t}`,
		{
			httpsAgent: agent,
			headers: {
				// Cookie: coookie,
				// Devid: `${devId.replace("devId=", "")}`,
				"X-Apikey": get_ApiKey().getApiKey(),
				"User-Agent":
					"Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/132.0.0.0 Safari/537.36",
				//"Ok-Verify-Token": "b30b27e7-a515-49cf-b095-96b50b0a45df",
			},
		}
	);

	return { transactions: token.data.data.hits };
};

const getTransaction = async (params, query) => {
	const { data } = await instance.get(
		`${endpoint}/transaction/detail?tx=${params.id}`,
		{
			headers: {
				cookie:
					"__cf_bm=6Nb_BhzZtOdGxVrRrnJoN83pN6rfOtlvuRxjI90nJ0E-1728040658-1.0.1.1-wWYmBJNnH55RvNIFlxo41XFAhHH4kt68pEvyR2fW2Zb_6hVNARhlKxBPCqoZQ_ZhtRQjCeFp6vReppgZbEYgbw; cf_clearance=ibbR6Iox6IDDq4r5WTmuKO0tkKPcwv8GloL.CCp7V3w-1728040665-1.2.1.1-Ef84Taqzk5aSmCiHV321WYtxUv7EIDJTG0SDgp4J.kjIs6gG9J7GVpSV9HE12tuH7xN5vtzdNt1sm6dOee1c20DQO2Lqd.rymeTv.0g340.1jEjK1BnkO4QUlkmEWdbBHzBOc43akGgAef7InJnNEKcg2eO5dPLXT0waBuDCHTs1VMJWBHhfeAE9jZz4C.pPKJKtUDvCyqvR.KRlokRlHo_gnzTVUQDawAtgdLimOOWAK5huvgGQURDoHngS1E5ne03ScjMqfL9HGKME7wXjsK1M9v6zX0WjGMiRDiXkMX3H8oZieb0wyG.j.UKR7jS3K9ElZYtMaZ2kTH1dRJ2DW13.4Q.H3Q.RZlc7Bv3a9FEKf79.2TUxXaiGtKqFH9IbCrPVxFCQ09YxgSp_U0H0AA; _ga=GA1.1.1401977830.1728040664; _ga_PS3V7B7KV0=GS1.1.1728040664.1.1.1728040689.0.0.0; __cf_bm=Mz6cAvTNjPAeUi30bGhjWOHzNal5QLqwS2T6omWu3c8-1728267695-1.0.1.1-oPl.fRzgy_UIvX86I4hXorbEOT5HKcOEAxcTsfbsYnUgtBpIH.Cck88Gm0KcosZyt6sRto_BNTjyJegI2oYryQ",
				"if-none-match": 'W/"622-Ukdydv8vKaxhKj3QjdlU5A1PS9k"',
				origin: "https://solscan.io",
				priority: "u=1, i",
				referer: "https://solscan.io/",
				"sol-aut": "5GvLD-NW7B9dls0fKbJHWeJeCUXOPQAbf70dKwfI:",
				"user-agent": generateRandomUserAgent(),
			},
		}
	);

	return { transaction: data.data };
};

/**
 * get transaction status
 * @param {Object} params
 */
const getTokens = async (params) => {
	const t = Date.now();

	console.log(get_ApiKey().getApiKey());

	const { data } = await axios.get(
		`https://www.oklink.com/api/explorer/v2/sol/types/${params.id}/tokenAssets?offset=0&limit=20&valuable=false&chain=solana&t=${t}`,
		{
			httpsAgent: agent,
			headers: {
				// Cookie: coookie,
				// Devid: `${devId.replace("devId=", "")}`,
				"X-Apikey": get_ApiKey().getApiKey(),
				"User-Agent":
					"Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/132.0.0.0 Safari/537.36",
				//"Ok-Verify-Token": "b30b27e7-a515-49cf-b095-96b50b0a45df",
			},
		}
	);

	console.log(data.data.extend.valueTotal);
	const tokenHoldings = {
		total: data.data.hits.length,
		balance: data.data.extend.valueTotal,
		fiatBalance: 0,
		tokens: [],
	};

	try {
		for (let index = 0; index < data.data.hits.length; index++) {
			const token = data.data.hits[index];

			tokenHoldings.fiatBalance += token.value;

			tokenHoldings.tokens.push({
				fiatBalance: token.valueUsd,
				name: token.tokenName,
				amount: token.amount,
				price: token.price,
				symbol: token.tokenSymbol,
				image: token.tokenSymbolUrl,
				address: token.tokenAccount,
				tokenAddress: token.mintAccount,
				tokenType: token.tokenType,
				blockTimestamp: new Date(token.blockTimestamp * 1000),
				//reputation: token.reputation,
				//quantity: token.amount,
				//decimals: token.decimals,
				owner: params.id,
			});
		}
	} catch (exception) {
		console.error({ exception });
	}

	return tokenHoldings;
};

const getTransfers = async (params) => {
	const { data } = await instance.get(
		`${endpoint}/account/transfer?address=${params.id}`,
		{
			headers: {
				cookie:
					"__cf_bm=6Nb_BhzZtOdGxVrRrnJoN83pN6rfOtlvuRxjI90nJ0E-1728040658-1.0.1.1-wWYmBJNnH55RvNIFlxo41XFAhHH4kt68pEvyR2fW2Zb_6hVNARhlKxBPCqoZQ_ZhtRQjCeFp6vReppgZbEYgbw; cf_clearance=ibbR6Iox6IDDq4r5WTmuKO0tkKPcwv8GloL.CCp7V3w-1728040665-1.2.1.1-Ef84Taqzk5aSmCiHV321WYtxUv7EIDJTG0SDgp4J.kjIs6gG9J7GVpSV9HE12tuH7xN5vtzdNt1sm6dOee1c20DQO2Lqd.rymeTv.0g340.1jEjK1BnkO4QUlkmEWdbBHzBOc43akGgAef7InJnNEKcg2eO5dPLXT0waBuDCHTs1VMJWBHhfeAE9jZz4C.pPKJKtUDvCyqvR.KRlokRlHo_gnzTVUQDawAtgdLimOOWAK5huvgGQURDoHngS1E5ne03ScjMqfL9HGKME7wXjsK1M9v6zX0WjGMiRDiXkMX3H8oZieb0wyG.j.UKR7jS3K9ElZYtMaZ2kTH1dRJ2DW13.4Q.H3Q.RZlc7Bv3a9FEKf79.2TUxXaiGtKqFH9IbCrPVxFCQ09YxgSp_U0H0AA; _ga=GA1.1.1401977830.1728040664; _ga_PS3V7B7KV0=GS1.1.1728040664.1.1.1728040689.0.0.0; __cf_bm=Mz6cAvTNjPAeUi30bGhjWOHzNal5QLqwS2T6omWu3c8-1728267695-1.0.1.1-oPl.fRzgy_UIvX86I4hXorbEOT5HKcOEAxcTsfbsYnUgtBpIH.Cck88Gm0KcosZyt6sRto_BNTjyJegI2oYryQ",
				"if-none-match": 'W/"622-Ukdydv8vKaxhKj3QjdlU5A1PS9k"',
				origin: "https://solscan.io",
				priority: "u=1, i",
				referer: "https://solscan.io/",
				"sol-aut": "uommLFJFHe0I=7pB9dls0fKSHLSixPco",
				"user-agent": generateRandomUserAgent(),
			},
		}
	);

	return { transfers: formatDataTranfe(data.data) };
};
const getTransfer = async (params) => {
	return { id: params.id };
};

const getGasTracker = async () => {
	try {
		const { data } = await instance.get(
			`${endpoint}/common/sol-market?tokenAddress=So11111111111111111111111111111111111111112`,
			{
				headers: {
					cookie:
						"__cf_bm=6Nb_BhzZtOdGxVrRrnJoN83pN6rfOtlvuRxjI90nJ0E-1728040658-1.0.1.1-wWYmBJNnH55RvNIFlxo41XFAhHH4kt68pEvyR2fW2Zb_6hVNARhlKxBPCqoZQ_ZhtRQjCeFp6vReppgZbEYgbw; cf_clearance=ibbR6Iox6IDDq4r5WTmuKO0tkKPcwv8GloL.CCp7V3w-1728040665-1.2.1.1-Ef84Taqzk5aSmCiHV321WYtxUv7EIDJTG0SDgp4J.kjIs6gG9J7GVpSV9HE12tuH7xN5vtzdNt1sm6dOee1c20DQO2Lqd.rymeTv.0g340.1jEjK1BnkO4QUlkmEWdbBHzBOc43akGgAef7InJnNEKcg2eO5dPLXT0waBuDCHTs1VMJWBHhfeAE9jZz4C.pPKJKtUDvCyqvR.KRlokRlHo_gnzTVUQDawAtgdLimOOWAK5huvgGQURDoHngS1E5ne03ScjMqfL9HGKME7wXjsK1M9v6zX0WjGMiRDiXkMX3H8oZieb0wyG.j.UKR7jS3K9ElZYtMaZ2kTH1dRJ2DW13.4Q.H3Q.RZlc7Bv3a9FEKf79.2TUxXaiGtKqFH9IbCrPVxFCQ09YxgSp_U0H0AA; _ga=GA1.1.1401977830.1728040664; _ga_PS3V7B7KV0=GS1.1.1728040664.1.1.1728040689.0.0.0; __cf_bm=Mz6cAvTNjPAeUi30bGhjWOHzNal5QLqwS2T6omWu3c8-1728267695-1.0.1.1-oPl.fRzgy_UIvX86I4hXorbEOT5HKcOEAxcTsfbsYnUgtBpIH.Cck88Gm0KcosZyt6sRto_BNTjyJegI2oYryQ",
					"if-none-match": 'W/"622-Ukdydv8vKaxhKj3QjdlU5A1PS9k"',
					origin: "https://solscan.io",
					priority: "u=1, i",
					referer: "https://solscan.io/",
					"sol-aut": "uommLFJFHe0I=7pB9dls0fKSHLSixPco",
					"user-agent": generateRandomUserAgent(),
				},
			}
		);

		return data.data;
	} catch (error) {
		return null;
	}
};

function formatData(transactions) {
	return transactions.map((tx) => ({
		txHash: tx.txHash,
		block_time: new Date(tx.blockTime * 1000),
		block: tx.slot,
		fee_SOL: tx.fee / 1_000_000_000,
		status: tx.status,
		signer_by: tx.signer,
	}));
}

function formatDataTranfe(transactions) {
	return transactions.map((tx) => ({
		amount: tx.amount,
		block_id: tx.block_id,
		value: tx.value.toFixed(9),
		block_time: new Date(tx.block_time * 1000),
		transHash: tx.trans_id,
		from_address: tx.from_address,
		from_token_account: tx.from_token_account,
		to_address: tx.to_address,
		to_token_account: tx.to_token_account,
		status: tx.status,
		traffic: tx.flow,
		signer_by: tx.signer,
	}));
}
function get_ApiKey() {
	const API_KEY = "a2c903cc-b31e-4547-9299-b6d07b7631ab";
	const c = 1111111111111;

	function encryptApiKey() {
		let e = API_KEY.split("");
		let n = e.splice(0, 8);
		return e.concat(n).join("");
	}

	function encryptTime(e) {
		let t = (1 * e + c).toString().split("");
		let n = Math.floor(10 * Math.random());
		let r = Math.floor(10 * Math.random());
		let o = Math.floor(10 * Math.random());
		return t.concat([n, r, o]).join("");
	}

	function comb(e, t) {
		return Buffer.from(`${e}|${t}`).toString("base64");
	}

	function getApiKey() {
		let e = Date.now();
		let t = encryptApiKey();
		e = encryptTime(e);
		return comb(t, e);
	}

	function getTimestamp(e) {
		let t = Buffer.from(e, "base64").toString("utf-8").split("|")[1];
		t = t.slice(0, -3);
		return t - c;
	}

	return {
		getApiKey,
		getTimestamp,
	};
}

// Obtener la API Key encriptada
// const encryptedKey = apiService.getApiKey();
// console.log({ encryptedKey });

// const timestamp = apiService.getTimestamp(encryptedKey);
// console.log({ timestamp });

module.exports = {
	getAddress,
	getTokens,
	getTransactionsList,
	getTransaction,
	getTransfers,
	getTransfer,
	getGasTracker,
};
