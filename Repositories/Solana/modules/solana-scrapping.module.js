const { getCleanInstance } = require("../../../Core/axios");
const instance = getCleanInstance(30000);
const { generateRandomUserAgent } = require("../../../Core/helpers");
const oklink = require("./oklink");
const solscan = require("./solscan");
const cheerio = require("cheerio");
const moment = require("moment");
/**
 * @param {*} params
 */

const getAddress = async (params) => {
	let response;

	switch (params.source) {
		case "solscan":
			response = await solscan.getAddress(params);
			break;
		case "oklink":
			response = await oklink.getAddress(params);
			break;
		default:
			response =
				(await solscan.getAddress(params)) || (await oklink.getAddress(params));
			break;
	}

	return response;
};

/**
 * get transaction status
 * @param {Object} params
 */
const getTokens = async (params, query) => {
	const response =
		(await solscan.getTokens(params, query)) ||
		(await oklink.getTokens(params, query));
	return response;
};

const getTransaction = async (params, query) => {
	try {
		const [txData] = await oklink.getTransaction(params, query);
		const tokens = txData?.innerMainAction?.innerMainAction || [];

		const { data: html } = await instance.get(
			`https://www.oklink.com/solana/tx/${params.id}`,
			{},
			{
				headers: {
					"user-agent":
						"Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/136.0.0.0 Safari/537.36",
					"x-cdn": "https://static.oklink.com",
				},
			}
		);

		const $ = cheerio.load(html);

		const status = $("div.index_content__fCFMK > div > div > div")
			.first()
			.text();
		const block = $("div.index_content__fCFMK > div > a").first().text();
		const timestamp = $("div.index_content__fCFMK > div > div").eq(1).text();

		const solValue = $(".text-ellipsis").first().text().trim();
		const valueDolar = $(".text-ellipsis").eq(1).text().trim();

		const fecha = moment(timestamp, "MM/DD/YYYY, HH:mm:ss");

		return {
			transactionType: tokens.length ? "swap" : "transfer",
			hash: params.id,
			status,
			block,
			timestamp,
			network: "solana",
			symbol: txData.symbol,
			imge: txData.logoUrl,
			age: fecha.fromNow(),
			data: fecha.format("YYYY-MM-DD HH:mm:ss"),
			from: txData.from,
			to: txData.to,
			amount: txData.lamports,
			transactionFeeSOL: solValue,
			transactionFeeDolar: valueDolar,
			tokensTransferred: formatSolanaTransfers(tokens),
		};
	} catch (error) {
		throw new Error("500");
	}
};

const getTransactions = async (params, query) => {
	const response =
		(await solscan.getTransfers(params, query)) ||
		(await oklink.getTransactions(params, query));
	return response;
};
function formatSolanaTransfers(transfers) {
	return transfers.map((tx) => ({
		from: tx.from,
		to: tx.to,
		amount: tx.value.toString(),
		symbol: tx.symbol || "SOL",
		network: "solana",
		token: tx.tokenName || "Wrapped SOL",
		icon: tx.logoUrl,
	}));
}
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

module.exports = {
	getAddress,
	getTokens,
	getTransaction,
	getTransactions,
	getGasTracker,
};
