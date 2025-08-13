const cheerio = require("cheerio");
const axios = require("axios");
const https = require("https");
const formatterClass = require("../../class/data-formatterClass");
const agent = new https.Agent({
	rejectUnauthorized: false,
});
const config = require("../../../Core/config");
const { getTickerPrice } = require("../../binance/modules/binance.module");

const moment = require("moment");

const getAddress = async (params) => {
	try {
		const address = params.id;

		const response = await axios.get(
			`https://www.oklink.com/es-la/sol/account/${address}`,

			{ httpsAgent: agent }
		);

		const $ = cheerio.load(response.data);

		const balance = $(
			"#root > main > div > div > div.single-pannel > div.index_info__kvp1Q.index_layout__2uO5I > div.index_title__064bd.index_card__GOZsN > div > div > div:nth-child(2) > div > div > div > span.inline-flex.align-items-center.max-w-100.overflow-hidden > div > div"
		).text();

		const SaldoSOL_USD = $(
			"#root > main > div > div > div.single-pannel > div.index_info__kvp1Q.index_layout__2uO5I > div.index_title__064bd.index_card__GOZsN > div > div > div:nth-child(1) > div > div > span > div"
		)
			.text()
			.split("$")[1];

		const fia = $(
			"#root > main > div > div > div.single-pannel > div.index_info__kvp1Q.index_layout__2uO5I > div.index_title__064bd.index_card__GOZsN > div > div > div:nth-child(2) > div > div > div > span.index_usdValue__M2TO1 > div > div"
		)
			.text()
			.split("$")[1];

		const { price } = await getTickerPrice({ symbol: "SOL" });

		const data = {
			address,
			balance: `${parseFloat(balance) || 0}`,
			fiatBalance: Number(`${parseFloat(SaldoSOL_USD) || 0}`),
			type: "system_account",
			account: {
				asset: "SOL",
				fiatBalance: `${parseFloat(fia) || 0}`,
				price: price || 0,
			},
		};

		data.tokenHoldings = await getTokens({ id: address }, { page: 0, show: 10 });

		const hasSolToken = data.tokenHoldings?.tokens?.some((token) => token.tokenType === "SOL");

		if (!hasSolToken) {
			data.tokenHoldings.tokens.unshift({
				amount: data.balance,
				fiatBalance: fia,
				image: "https://vtxz26svcpnbg5ncfansdb5zt33ec2bwco6uuah3g3sow3pewfma.arweave.zelf.world/rO-delUT2hN1oigbIYe5nvZBaDYTvUoA-zbk623ksVg",
				name: "Solana",
				price: data.account.price,
				symbol: "SOL",
				tokenType: "SOL",
			});
		}

		const { transactions } = await getTransactions({ id: address }, { page: 0, show: 10 });

		data.transactions = transactions;

		return data;
	} catch (error) {
		console.error(error);
		return null;
	}
};

const getTokens = async (params, query) => {
	try {
		const t = Date.now();

		const { data } = await axios.get(
			`https://www.oklink.com/api/explorer/v2/sol/types/${params.id}/tokenAssets?offset=${query.page}&limit=${query.show}&valuable=false&chain=solana&t=${t}`,
			{
				httpsAgent: agent,
				headers: {
					// Cookie: coookie,
					// Devid: `${devId.replace("devId=", "")}`,
					"X-Apikey": get_ApiKey().getApiKey(),
					"User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/132.0.0.0 Safari/537.36",
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
					amount: Number(parseFloat(token.amount).toFixed(5) || 0),
					price: Number(parseFloat(token.price).toFixed(5)) || 0,
					symbol: token.tokenSymbol,
					image: token.tokenSymbolUrl,
					address: token.tokenAccount,
					tokenAddress: token.mintAccount,
					tokenType: token.tokenType,
					//blockTimestamp: new Date(token.blockTimestamp * 1000),
					owner: params.id,
				});
			}
		} catch (exception) {
			console.error({ exception });
		}

		return tokenHoldings;
	} catch (error) {
		console.error(error);
		return null;
	}
};

let transactions = [];

const getTransaction = async (params, query) => {
	try {
		const t = Date.now();

		const address = params.id;

		const { data } = await axios.get(`https://www.oklink.com/api/explorer/v2/sol/mainAction/${address}?chain=solana&t=${t}`, {
			httpsAgent: agent,
			headers: {
				"X-Apikey": get_ApiKey().getApiKey(),
				"User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/132.0.0.0 Safari/537.36",
			},
		});

		return data.data;
	} catch (error) {
		return null;
	}
};

const getTransactions = async (params, query) => {
	try {
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
					"User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/132.0.0.0 Safari/537.36",
					//"Ok-Verify-Token": "b30b27e7-a515-49cf-b095-96b50b0a45df",
				},
			}
		);

		const slp = await axios.get(
			`https://www.oklink.com/api/explorer/v2/sol/splTransaction/${address}?offset=${query.page}&limit=${query.show}&chain=solana&t=${t}`,

			{
				httpsAgent: agent,
				headers: {
					// Cookie: coookie,
					// Devid: `${devId.replace("devId=", "")}`,
					"X-Apikey": get_ApiKey().getApiKey(),
					"User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/132.0.0.0 Safari/537.36",
					//"Ok-Verify-Token": "b30b27e7-a515-49cf-b095-96b50b0a45df",
				},
			}
		);
		transactions = [...data.data.hits, ...slp.data.data.hits];

		let total = (data.data.hits.length += slp.data.data.hits.length);

		// Format and sort all transactions together
		const formattedTransactions = addTrafficParameter(formatTransactions(transactions, address), address);

		return {
			pagination: {
				records: total.toString(),
				pages: query.page,
				page: query.page,
			},
			transactions: formattedTransactions,
		};
	} catch (error) {
		return null;
	}
};

function formatTransactions(transfers, address) {
	try {
		const formattedTransactions = transfers.map((tx) => ({
			hash: tx.signature,
			block: tx.slot.toString(),
			date: moment(tx.timestamp * 1000).format("YYYY-MM-DD HH:mm:ss"),
			age: moment(tx.timestamp * 1000).fromNow(),
			from: tx.from,
			method: "Transfer",
			traffic: tx.flow,
			to: tx.to,
			amount: Number(tx.changeAmount),
			from_token_account: tx.from,
			to_token_account: address,
			status: tx.status,
			asset: tx.tokenName ? tx.tokenName : "SOL",
			timestamp: tx.timestamp, // Keep original timestamp for sorting
		}));

		// Sort by timestamp (newest first)
		return formattedTransactions.sort((a, b) => b.timestamp - a.timestamp);
	} catch (error) {
		console.error({ error });
		return [];
	}
}

function addTrafficParameter(transactions, userAddress) {
	return transactions.map((tx) => ({
		...tx,
		traffic: tx.to === userAddress ? "IN" : "OUT",
	}));
}

function get_ApiKey() {
	const API_KEY = config.oklink?.apiKey;
	const c = 1111111111111;

	function encryptApiKey() {
		// Handle case where API key is undefined
		if (!API_KEY) {
			console.warn("OKLink API key is not configured. Some features may not work.");
			return "default_key_for_fallback";
		}
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

module.exports = {
	getAddress,
	getTokens,
	getTransactions,
	getTransaction,
	get_ApiKey,
};
