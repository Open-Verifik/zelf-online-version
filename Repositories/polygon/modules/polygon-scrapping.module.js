const cheerio = require("cheerio");
const moment = require("moment");

const { getCleanInstance } = require("../../../Core/axios");
const { getTickerPrice } = require("../../binance/modules/binance.module");

const baseUrl = "https://polygonscan.com";
const instance = getCleanInstance(30000);

/**
 * @param {*} params
 */
const getBalance = async (params) => {
	try {
		const address = params.id;

		const checkRedirect = await instance.get(`https://polygon.blockscout.com/api/v2/search/check-redirect?q=${address}`, {
			headers: {
				"user-agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/127.0.0.0 Safari/537.36",
				"Upgrade-Insecure-Requests": "1",
			},
		});

		const formatedAddress = checkRedirect.data.parameter;

		const { data } = await instance.get(`https://polygon.blockscout.com/api/v2/addresses/${formatedAddress}`, {
			headers: {
				"user-agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/127.0.0.0 Safari/537.36",
				"Upgrade-Insecure-Requests": "1",
			},
		});

		const { price: price } = await getTickerPrice({ symbol: "POL" });

		const tokensResponse = await instance.get(`https://polygon.blockscout.com/api/v2/addresses/${formatedAddress}/tokens?type=ERC-20`);

		function formatearTokens(entrada) {
			return entrada.map((item) => {
				const token = item.token;
				const decimals = parseInt(token.decimals);
				const rawAmount = item.value;
				const price = item.token.exchange_rate;
				const amount = Number(rawAmount) / Math.pow(10, decimals);

				return {
					_amount: amount,
					_fiatBalance: (amount * price).toFixed(decimals),
					_price: Number(price),
					address: token.address,
					amount: amount.toFixed(decimals),
					decimals: decimals,
					fiatBalance: amount * price,
					image: token.icon_url || "",
					name: token.name,
					price: price,
					symbol: token.symbol,
					tokenType: token.type || "ERC-20",
				};
			});
		}

		const tokens = formatearTokens(tokensResponse.data.items);

		const transactions = await getTransactionsList({ id: address }, { show: 10 });

		const response = {
			address,
			balance: data.coin_balance,
			fiatBalance: data.coin_balance * price,
			type: "system_account",
			account: {
				asset: "POL",
				fiatBalance: data.coin_balance * price,
				price: price,
			},
			tokenHoldings: {
				total: 1 + tokens.length,
				balance: data.coin_balance,
				tokens: [
					{
						tokenType: "ERC-20",
						fiatBalance: data.coin_balance * price,
						symbol: "POL",
						name: "Polygon",
						price: price,
						image: "https://s2.coinmarketcap.com/static/img/coins/64x64/28321.png",
						amount: data.coin_balance,
					},
					...tokens,
				],
			},
			transactions: transactions.transactions,
		};

		return response;
	} catch (error) {
		console.error({ error });
	}
};

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

		const lowPriorityAndBase = $("#spanDynamicLowPriorityAndBase").text().trim();

		let lowTime = $("#divLowPrice > div.text-muted")
			.first()
			.text()
			.replace(/^\(([^)]+)\).*$/, "$1")
			.trim();

		const priceInDollars = $("div.text-muted")
			.text()
			.match(/\$\d+\.\d+/)[0];

		const lowNumbers = lowPriorityAndBase.match(/\d+(\.\d+)?/g);
		const lowBase = parseFloat(lowNumbers[0]).toString();
		const lowPriority = parseFloat(lowNumbers[1]).toString();

		const avgPriorityAndBase = $("#spanDynamicProposePriorityAndBase").text().trim();
		const avgPriceInDollars = $("div.text-muted")
			.text()
			.match(/\$\d+\.\d+/)[0];

		let averageTime = $("#divAvgPrice > div.text-muted")
			.text()
			.replace(/^\(([^)]+)\).*$/, "$1")
			.trim();

		const avgNumbers = avgPriorityAndBase.match(/\d+(\.\d+)?/g);
		const avgBase = parseFloat(avgNumbers[0]).toString();
		const avgPriority = parseFloat(avgNumbers[1]).toString();

		const highPriorityAndBase = $("#spanDynamicHighPriorityAndBase").text().trim();
		const highPriceInDollars = $("div.text-muted")
			.text()
			.match(/\$\d+\.\d+/)[0];

		let highTime = $("#divHighPrice > div.text-muted")
			.text()
			.replace(/^\(([^)]+)\).*$/, "$1")
			.trim();

		const highNumbers = highPriorityAndBase.match(/\d+(\.\d+)?/g);
		const highBase = parseFloat(highNumbers[0]).toString();
		const highPriority = parseFloat(highNumbers[1]).toString();

		const featuredActions = [];

		const timeRegexp = /\(([^)]+)\)/;

		lowTime = `${lowTime.match(timeRegexp)?.[1]}`?.trim();
		averageTime = `${averageTime.match(timeRegexp)?.[1]}`?.trim();
		highTime = `${highTime.match(timeRegexp)?.[1]}`?.trim();

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

		// Formar el objeto de respuesta final.
		const response = {
			low: {
				base: lowBase,
				cost: priceInDollars,
				gwei: lowGwei,
				priority: lowPriority,
				time: lowTime,
			},
			average: {
				base: avgBase,
				cost: avgPriceInDollars,
				gwei: averageGwei,
				priority: avgPriority,
				time: averageTime,
			},
			high: {
				base: highBase,
				cost: highPriceInDollars,
				gwei: highGwei,
				priority: highPriority,
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

		const baseUrl = "https://polygonscan.com";

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
					amount,
					from,
					to,
					icon: icon ? `${baseUrl}${icon}` : null,
					network: "polygon",
					symbol,
					token: tokenName,
				});
			});
		} catch (error) {}

		const status = $("#ContentPlaceHolder1_maintable > div.card.p-5 > div:nth-child(2) span.badge").text().split(" ")[0].trim();

		const block = $(
			"#ContentPlaceHolder1_maintable > div.card.p-5 > div:nth-child(3) > div.col-md-9 > div > span.d-flex.align-items-center.gap-1 > a"
		).text();

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
		///en pruba 9
		const to_a = $("#ContentPlaceHolder1_maintable div.to-address-col").html();

		const to_div = cheerio.load(to_a);

		const to = to_div("a.js-clipboard").attr("data-clipboard-text");

		const amount = $("#ContentPlaceHolder1_spanValue > div > span:nth-child(2)").text().replace("POL", "").trim();

		const fiatAmount = $("#ContentPlaceHolder1_spanValue > div > span.text-muted").text().replace("($", "").replace(")", "").trim();

		const transactionFeeNetwork = $("#ContentPlaceHolder1_spanTxFee > div > span:nth-child(1)").text().replace("POL", "").trim();

		const transactionFeeFiat = $("#ContentPlaceHolder1_spanTxFee > div > span.text-muted").text().replace("($", "").replace(")", "").trim();

		const gasPriceGwei = $("#ContentPlaceHolder1_spanGasPrice").text().split("Gwei");

		const gasPrice = gasPriceGwei[0].trim();
		const gwei = gasPriceGwei[1].replace("(", "").replace(")", "").replace("POL", "").trim();

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
			image: "https://polygonscan.com/assets/svg/logos/polygon-default-logo.svg",
			network: "polygon",
			observation,
			status,
			symbol: "POL",
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
		console.error(exception);
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
					asset: "POL",
					block: tx.Blockno,
					date: tx.DateTime,
					fiatAmount: tx.Value.replace("$", ""),
					from: tx.Sender,
					hash: tx.Txhash,
					method: tx.Method,
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
