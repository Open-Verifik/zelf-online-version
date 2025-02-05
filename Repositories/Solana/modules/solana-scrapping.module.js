const cheerio = require("cheerio");
const axios = require("axios");
const https = require("https");
const formatterClass = require("../../class/data-formatterClass");
const formatterNumberClass = require("../../class/data-formatterNumberClass");
const agent = new https.Agent({
	rejectUnauthorized: false,
});
const { getTickerPrice } = require("../../binance/modules/binance.module");
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

		const $ = cheerio.load(response.data);

		const balance = $(
			"#root > main > div > div.single-pannel > div.index_infoWrapper__4GvU6 > div:nth-child(1) > div:nth-child(3) > div.index_value__vVl9q > div > span.inline-flex.align-items-center.max-w-100.overflow-hidden > div > div"
		).text();

		const SaldoSOL_USD = $(
			"#root > main > div > div.single-pannel > div.index_infoWrapper__4GvU6 > div:nth-child(1) > div:nth-child(3) > div.index_value__vVl9q > div > span.index_usdValue__M2TO1 > div > div"
		)
			.text()
			.split("$")[1];

		return formatData({
			address,
			balance: parseFloat(balance),
			type: "system_account",
			account: {
				asset: "SOL",
				fiatValue: parseFloat(SaldoSOL_USD) || 0,
				price: (await getTickerPrice({ symbol: "SOL" })) || 0,
			},
			tokenHoldings: await getTokens({ id: address }, { page: 0, show: 10 }),
		});
	} catch (error) {
		console.error({ error });
	}
};

/**
 * get transaction status
 * @param {Object} params
 */
const getTokens = async (params, query) => {
	const t = Date.now();

	const { data } = await axios.get(
		`https://www.oklink.com/api/explorer/v2/sol/types/${params.id}/tokenAssets?offset=${query.page}&limit=${query.show}&valuable=false&chain=solana&t=${t}`,
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

	const tokenHoldings = {
		total: data.data.hits.length,
		balance: data.data.extend.valueTotal,
		fiatBalance: 0,
		tokens: [],
	};

	try {
		for (let index = 0; index < data.data.hits.length; index++) {
			const token = data.data.hits[index];

			tokenHoldings.fiatBalance += parseFloat(token.valueUsd) || 0;

			tokenHoldings.tokens.push({
				fiatBalance: parseFloat(token.valueUsd) || undefined,
				name: token.tokenName,
				amount: parseFloat(token.amount),
				price: parseFloat(token.price) || 0,
				symbol: token.tokenSymbol,
				image: token.tokenSymbolUrl,
				address: token.tokenAccount,
				tokenAddress: token.mintAccount,
				tokenType: token.tokenType,
				blockTimestamp: new Date(token.blockTimestamp * 1000),
				owner: params.id,
			});
		}
	} catch (exception) {
		console.error({ exception });
	}

	return tokenHoldings;
};

/**
 * get transactions list
 * @param {Object} params
 * @returns
 */
const getTransactions = async (params, query) => {
	const t = Date.now();

	const token = await axios.get(
		`https://www.oklink.com/api/explorer/v2/sol/transaction/${params.id}?offset=${query.page}&limit=${query.show}&address=${params.id}&chain=solana&t=${t}`,
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

	return { transactions: formatDataTransactions(token.data.data.hits) };
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

const getTransfers = async (params, query) => {
	const t = Date.now();
	const address = params.id;

	const { data } = await axios.get(
		`https://www.oklink.com/api/explorer/v2/sol/solTransaction/${address}?offset=${query.page}&limit=${query.show}&chain=solana&t=${t}`,

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

	return {
		transfers: addTrafficParameter(
			formatDataTransfers(data.data.hits, address),
			address
		),
	};
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

function formatDataTransactions(transactions) {
	try {
		return transactions.map((tx) => ({
			txHash: tx.signature,
			block_time: new Date(tx.timestamp * 1000),
			block: tx.slot,
			fee_SOL: tx.fee,
			status: tx.status,
			signer_by: tx.feePayer,
		}));
	} catch (error) {
		return [];
	}
}

function formatDataTransfers(transfers, address) {
	try {
		return transfers.map((tx) => ({
			amount: tx.changeAmount.toFixed(9),
			block_id: tx.slot,
			block_time: new Date(tx.timestamp * 1000),
			transHash: tx.signature,
			from_address: tx.from,
			from_token_account: tx.from,
			to_address: tx.to,
			to_token_account: address,
			status: tx.status,
			traffic: tx.flow,
			signer_by: tx.signer,
		}));
	} catch (error) {
		return [];
	}
}

function addTrafficParameter(transactions, userAddress) {
	return transactions.map((tx) => ({
		...tx,
		traffic: tx.to_address === userAddress ? "in" : "out",
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
	getAddress,
	getTokens,
	getTransactions,
	getTransaction,
	getTransfers,
	getTransfer,
	getGasTracker,
};
