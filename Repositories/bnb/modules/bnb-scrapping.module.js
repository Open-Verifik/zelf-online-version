const cheerio = require("cheerio");
const moment = require("moment");

const { getCleanInstance } = require("../../../Core/axios");
const { getTickerPrice } = require("../../binance/modules/binance.module");

const baseUrl = "https://bscscan.com";
const instance = getCleanInstance(30000);

const getBalance = async (params) => {
	try {
		const address = params.id;
		const { data } = await instance.get(`https://bsc-explorer-api.nodereal.io/api/token/getBalance?address=${address}`);
		const { price } = await getTickerPrice({ symbol: "BNB" });
		const { transactions } = await getTransactionsList({ id: address }, { show: "10" });

		function sumarPrice(tokens) {
			return tokens.reduce((acumulador, token) => acumulador + parseFloat(token.price), 0);
		}

		const tokens = await getTokens({ id: address });

		const totalFiatBalance = sumarPrice(tokens);

		const rawValue = BigInt(data.data);
		const BSCValue = Number(rawValue) / 1e18;
		const fiatBalance = BSCValue * price;
		const response = {
			address,
			balance: BSCValue,
			fiatBalance,
			account: {
				asset: "BSC",
				fiatBalance: fiatBalance.toString(),
				price: price,
			},
			tokenHoldings: {
				total: tokens.length,
				balance: totalFiatBalance,
				tokens: tokens,
			},
			transactions,
		};

		return response;
	} catch (error) {
		console.error({ error });
	}
};

const getTokens = async (params) => {
	try {
		const address = params.id;

		const { data } = await instance.get(`https://bsc-explorer-api.nodereal.io/api/token/getTokensByAddress?address=${address}&pageSize=0x64`);

		const formattedTokens = formatTokens(data.data);

		return formattedTokens;
	} catch (error) {
		console.error({ error });
	}
};

function formatTokens(data) {
	const erc20Tokens = data.erc20.details || [];

	return erc20Tokens.map((token) => {
		const decimals = parseInt(token.tokenDecimals, 16); // De hexadecimal a número
		const rawBalance = BigInt(token.tokenBalance); // Balance en BigInt
		const amount = Number(rawBalance) / Math.pow(10, decimals); // Balance en unidades normales

		const price = token.price || 0;
		const fiatBalance = amount * price;

		return {
			_amount: amount,
			_fiatBalance: fiatBalance.toFixed(7),
			_price: price,
			address: token.tokenAddress,
			amount: amount.toFixed(12),
			decimals: decimals,
			fiatBalance: parseFloat(fiatBalance.toFixed(7)),
			image: "", // Puedes después añadir un fetch a CoinMarketCap o una API para obtener imágenes
			name: token.tokenName,
			price: price.toFixed(6),
			symbol: token.tokenSymbol.length <= 10 ? token.tokenSymbol : token.tokenSymbol.substring(0, 10), // Limitamos símbolo si es muy largo
			tokenType: "BEP-20",
		};
	});
}

const getGasTracker = async () => {
	try {
		let { data } = await instance.get(`${baseUrl}/gastracker`, {
			headers: {
				"user-agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/127.0.0.0 Safari/537.36",
				"Upgrade-Insecure-Requests": "1",
			},
		});

		const $ = cheerio.load(data);

		const lowGwei = $("#spanLowPrice").text().replace(/\n/g, "").trim();
		const averageGwei = $("#spanAvgPrice").text().replace(/\n/g, "").trim();
		const highGwei = $("#spanHighPrice").text().replace(/\n/g, "").trim();

		const lowTime = $("#divLowPrice > div.text-muted").first().text().replace(/\n/g, "").trim().trim();

		const averageTime = $("#divAvgPrice > div.text-muted").text().replace(/\n/g, "").trim().trim();

		const highTime = $("#divHighPrice > div.text-muted").text().replace(/\n/g, "").trim().trim();

		const featuredActions = [];
		$("#content > section.container-xxl.pb-16 > div.row.g-4.mb-4 > div:nth-child(2) > div > div > div:nth-child(2) > div > table tr").each(
			(index, element) => {
				const action = $(element).find("td span").text().trim();
				const low = $(element).find("td").eq(1).text().replace("$", "").trim();
				const average = $(element).find("td").eq(2).text().replace("$", "").trim();
				const high = $(element).find("td").eq(3).text().replace("$", "").trim();

				if (action) {
					featuredActions.push({
						action,
						low,
						average,
						high,
					});
				}
			}
		);

		const response = {
			low: {
				gwei: lowGwei,
				time: lowTime,
			},
			average: {
				gwei: averageGwei,
				time: averageTime,
			},
			high: {
				gwei: highGwei,
				time: highTime,
			},
			featuredActions,
		};

		return response;
	} catch (error) {
		console.error({ error: error });
	}
};

/**
 * get transaction status
 * @param {Object} params
 */
const getTransactionStatus = async (params) => {
	try {
		const id = params.id;

		const { data } = await instance.get(`${baseUrl}/tx/${id}`, {
			headers: {
				"user-agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/127.0.0.0 Safari/537.36",
				"Upgrade-Insecure-Requests": "1",
			},
		});

		const $ = cheerio.load(data);

		const tokensTransferred = [];
		const transactionType = $("#wrapperContent > div > div > span:nth-child(1)").text() || "Swap";

		try {
			const transactionDetailsHtml = $("#nav_tabcontent_erc20_transfer").html();

			const $$ = cheerio.load(transactionDetailsHtml);

			$$(".row-count").each((i, elem) => {
				const $elem = $$(elem);
				const from = $elem.find('span.fw-medium:contains("From")').next("a").attr("data-highlight-target");
				const to = $elem.find('span.fw-medium:contains("To")').next("a").attr("data-highlight-target");
				const amount = $elem.find('span.fw-medium:contains("For")').next("span").text();
				const tokenElement = $elem.find('a[href*="/token/"]').last();
				const tokenName = tokenElement.find('span[data-bs-toggle="tooltip"]').first().text().trim();

				const symbol = tokenElement.find("span > span.text-muted > span").first().text().trim();

				const icon = tokenElement.find("img").attr("src");

				tokensTransferred.push({
					from,
					to,
					amount,
					symbol,
					network: "BNBSmartChain",
					token: tokenName,
					icon: icon ? `https://bscscan.com${icon}` : null,
				});
			});
		} catch (error) {}

		const status = $("#ContentPlaceHolder1_maintable > div.card.p-5 > div:nth-child(2) span.badge").text().split(" ")[0].trim();

		const block = $(
			"#ContentPlaceHolder1_maintable > div.card.p-5 > div:nth-child(3) > div.col-md-9 > div > span.d-flex.align-items-center.gap-1 > a"
		).text();

		const amount = $("#ContentPlaceHolder1_spanValue > div > span:nth-child(2)").text().replace("BSC", "").trim();
		const fiatAmount = $("#ContentPlaceHolder1_spanValue > div > span.text-muted").text().replace("($", "").replace(")", "").trim();

		const timestamp2 = $("#ContentPlaceHolder1_divTimeStamp > div > div.col-md-9").text().trim().replace(/\n/g, "").split("|")[0].split(" (")[0];
		const timestamp = $("#ContentPlaceHolder1_divTimeStamp > div > div.col-md-9").text().trim().split("|")[0];

		const date = $("#ContentPlaceHolder1_divTimeStamp > div > div.col-md-9")
			.text()
			.trim()
			.replace(/\n/g, "")
			.split("|")[0]
			.split(" (")[1]
			.replace(" AM UTC)", "")
			.replace(" PM UTC)", "");

		const from_a = $("#ContentPlaceHolder1_maintable div.from-address-col").html();
		const from_div = cheerio.load(from_a);
		const from = from_div("a.js-clipboard").attr("data-clipboard-text");

		const to_a = $("#ContentPlaceHolder1_maintable div.to-address-col").html();
		const to_div = cheerio.load(to_a);
		const to = to_div("a.js-clipboard").attr("data-clipboard-text");

		const transactionFeeNetwork = $("#ContentPlaceHolder1_spanTxFee > div > span:nth-child(1)").text().replace("BSC", "").trim();
		const transactionFeeFiat = $("#ContentPlaceHolder1_spanTxFee > div > span.text-muted").text().replace("($", "").replace(")", "").trim();

		const gasPriceGwei = $("#ContentPlaceHolder1_spanGasPrice").text();

		let gasPrice = 0;
		let gwei = 0;

		if (gasPriceGwei.includes("Gwei")) {
			const gasPriceGweiArray = gasPriceGwei.split("Gwei");

			gasPrice = gasPriceGweiArray[0].trim();
			gwei = gasPriceGweiArray[1].replace("(", "").replace(")", "").replace("BSC", "").trim();
		}

		const observation = $("#ContentPlaceHolder1_spanValue > div > span:nth-child(4) > span").text().replace("[", "").replace("]", "").trim();

		const response = {
			age: timestamp2,
			amount: Number(amount),
			block,
			date: moment(date, "MMM-DD-YYYY HH:mm:ss").format("YYYY-MM-DD HH:mm:ss"),
			fiatAmount: Number(fiatAmount),
			from,
			gasPrice,
			gwei,
			hash: id,
			id,
			image: "https://bscscan.com/assets/bsc/images/svg/logos/chain-dim.svg",
			network: "BNBSmartChain",
			observation,
			status,
			symbol: "BNB",
			timestamp,
			to,
			tokensTransferred,
			transactionFeeFiat: Number(transactionFeeFiat),
			transactionFeeNetwork,
			transactionType,
		};

		if (!id || !status || !to || !from) {
			throw new Error("404:transaction_not_found");
		}

		return response;
	} catch (exception) {
		console.log(exception);
		const error = new Error("transaction_not_found");

		error.status = 404;

		throw error;
	}
};

/**
 * get transactions list
 * @param {Object} params
 * @returns
 */
const getTransactionsList = async (params, query) => {
	const address = params.id;
	const show = query.show;

	try {
		const { data } = await instance.get(`${baseUrl}/txs?a=${address}&ps=${show}`, {
			headers: {
				"user-agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/127.0.0.0 Safari/537.36",
				"Upgrade-Insecure-Requests": "1",
			},
		});

		const $ = cheerio.load(data);

		const transactions = JSON.parse(data.split("quickExportTransactionListData = '")[1].split("';")[0]);

		const formatTransactions = (address, transactions) => {
			return transactions.map((tx) => {
				return {
					age: moment(tx.DateTime).fromNow(),
					amount: tx.Amount.split(" ")[0].replace(",", ""),
					asset: "BSC",
					block: tx.Blockno,
					date: tx.DateTime,
					fiatAmount: tx.Value.replace("$", ""),
					from: tx.Sender,
					hash: tx.Txhash,
					mBSCod: tx.MBSCod,
					to: tx.Receiver,
					traffic: determineTraffic(address, tx.Sender, tx.Receiver),
					txnFee: tx.TxnFee,
				};
			});
		};

		function determineTraffic(address, from, to) {
			if (address.toLowerCase() === from.toLowerCase()) {
				return "OUT";
			} else if (address.toLowerCase() === to.toLowerCase()) {
				return "IN";
			} else {
				return "UNKNOWN";
			}
		}
		const records = $("#ContentPlaceHolder1_divDataInfo > div > div:nth-child(1) > span").text().match(/\d+/g).join("");
		const nPage = $("#ContentPlaceHolder1_divBottomPagination > nav > ul > li:nth-child(3)").text().replace("Page", "").split("of");

		const pagination = {
			records,
			pages: nPage ? nPage?.[1]?.trim() : 0,
			page: nPage ? nPage?.[0]?.trim() : 0,
		};

		return {
			pagination,
			transactions: formatTransactions(address, transactions),
		};
	} catch (error) {
		console.error({ error });

		return {
			pagination: { records: "0", pages: "0", page: "0" },
			transactions: [],
		};
	}
};

module.exports = {
	getBalance,
	getGasTracker,
	getTransactionsList,
	getTransactionStatus,
};
