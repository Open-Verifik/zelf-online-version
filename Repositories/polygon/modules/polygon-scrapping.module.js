const { getCleanInstance } = require("../../../Core/axios");
const instance = getCleanInstance(30000);
const cheerio = require("cheerio");
const { getTickerPrice } = require("../../binance/modules/binance.module");
const baseUrl = "https://polygonscan.com";
const moment = require("moment");

/**
 * @param {*} params
 */

const getBalance = async (params) => {
	try {
		const address = params.id;

		const checkRedirect = await instance.get(
			`https://polygon.blockscout.com/api/v2/search/check-redirect?q=${address}`,
			{
				headers: {
					"user-agent":
						"Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/127.0.0.0 Safari/537.36",
					"Upgrade-Insecure-Requests": "1",
				},
			}
		);

		const formatedAddress = checkRedirect.data.parameter;

		const { data } = await instance.get(
			`https://polygon.blockscout.com/api/v2/addresses/${formatedAddress}`,
			{
				headers: {
					"user-agent":
						"Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/127.0.0.0 Safari/537.36",
					"Upgrade-Insecure-Requests": "1",
				},
			}
		);

		const { price: price } = await getTickerPrice({ symbol: "POL" });

		const tokensResponse = await instance.get(
			`https://polygon.blockscout.com/api/v2/addresses/${formatedAddress}/tokens?type=ERC-20`
		);

		function formatearTokens(entrada) {
			return entrada.map((item) => {
				const token = item.token;
				const decimals = parseInt(token.decimals);
				const rawAmount = item.value;
				const price = item.token.exchange_rate;
				const amount = Number(rawAmount) / Math.pow(10, decimals);

				return {
					tokenType: token.type || "ERC-20",
					fiatBalance: amount * price,
					_fiatBalance: (amount * price).toFixed(decimals),
					symbol: token.symbol,
					name: token.name,
					price: price,
					_price: Number(price),
					image: token.icon_url || "",
					decimals: decimals,
					amount: amount.toFixed(decimals),
					_amount: amount,
					address: token.address,
				};
			});
		}

		const tokens = formatearTokens(tokensResponse.data.items);

		const transactions = await getTransactionsList(
			{ id: address },
			{ show: 10 }
		);

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
						image:
							"https://s2.coinmarketcap.com/static/img/coins/64x64/28321.png",
						amount: data.coin_balance,
					},
					...tokens,
				],
			},
			transactions: transactions.transactions,
		};

		return response;
	} catch (error) {
		//console.error({ error });
	}
};

const getGasTracker = async (params) => {
	try {
		let { data } = await instance.get(`${baseUrl}/gastracker`, {
			headers: {
				"user-agent":
					"Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/127.0.0.0 Safari/537.36",
				"Upgrade-Insecure-Requests": "1",
			},
		});

		const $ = cheerio.load(data);

		const lowGwei = $("#spanLowPrice").text().replace(/\n/g, "").trim();
		const averageGwei = $("#spanAvgPrice").text().replace(/\n/g, "").trim();
		const highGwei = $("#spanHighPrice").text().replace(/\n/g, "").trim();

		const lowPriorityAndBase = $("#spanDynamicLowPriorityAndBase")
			.text()
			.trim();

		const lowTime = $("#divLowPrice > div.text-muted")
			.first()
			.text()
			.replace(/\n/g, "")
			.trim()
			.trim();
		const priceInDollars = $("div.text-muted")
			.text()
			.match(/\$\d+\.\d+/)[0];

		const lowNumbers = lowPriorityAndBase.match(/\d+(\.\d+)?/g);
		const lowBase = parseFloat(lowNumbers[0]).toString();
		const lowPriority = parseFloat(lowNumbers[1]).toString();

		const avgPriorityAndBase = $("#spanDynamicProposePriorityAndBase")
			.text()
			.trim();
		const averageTime = $("#divAvgPrice > div.text-muted")
			.text()
			.replace(/\n/g, "")
			.trim()
			.trim();
		const avgPriceInDollars = $("div.text-muted")
			.text()
			.match(/\$\d+\.\d+/)[0];
		const avgNumbers = avgPriorityAndBase.match(/\d+(\.\d+)?/g);
		const avgBase = parseFloat(avgNumbers[0]).toString();
		const avgPriority = parseFloat(avgNumbers[1]).toString();

		const highPriorityAndBase = $("#spanDynamicHighPriorityAndBase")
			.text()
			.trim();
		const highTime = $("#divHighPrice > div.text-muted")
			.text()
			.replace(/\n/g, "")
			.trim()
			.trim();
		const highPriceInDollars = $("div.text-muted")
			.text()
			.match(/\$\d+\.\d+/)[0];
		const highNumbers = highPriorityAndBase.match(/\d+(\.\d+)?/g);
		const highBase = parseFloat(highNumbers[0]).toString();
		const highPriority = parseFloat(highNumbers[1]).toString();

		const featuredActions = [];
		$(
			"#content > section.container-xxl.pb-16 > div.row.g-4.mb-4 > div:nth-child(2) > div > div > div:nth-child(2) > div > table tr"
		).each((index, element) => {
			const action = $(element).find("td span").text().trim();
			const low = $(element).find("td").eq(1).text().replace("$", "").trim();
			const average = $(element)
				.find("td")
				.eq(2)
				.text()
				.replace("$", "")
				.trim();
			const high = $(element).find("td").eq(3).text().replace("$", "").trim();

			if (action) {
				featuredActions.push({
					action,
					low,
					average,
					high,
				});
			}
		});

		// Formar el objeto de respuesta final.
		const response = {
			low: {
				gwei: lowGwei,
				base: lowBase,
				priority: lowPriority,
				cost: priceInDollars,
				time: lowTime,
			},
			average: {
				gwei: averageGwei,
				base: avgBase,
				priority: avgPriority,
				cost: avgPriceInDollars,
				time: averageTime,
			},
			high: {
				gwei: highGwei,
				base: highBase,
				priority: highPriority,
				cost: highPriceInDollars,
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
				"user-agent":
					"Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/127.0.0.0 Safari/537.36",
				"Upgrade-Insecure-Requests": "1",
			},
		});

		const $ = cheerio.load(data);
		const tokensTransferred = [];
		const transactionType =
			$("#wrapperContent > div > div > span:nth-child(1)").text() || "Swap";

		try {
			const transactionDetailsHtml = $("#nav_tabcontent_erc20_transfer").html();

			const $$ = cheerio.load(transactionDetailsHtml);

			$$(".row-count").each((i, elem) => {
				const $elem = $$(elem);
				const from = $elem
					.find('span.fw-medium:contains("From")')
					.next("a")
					.attr("data-highlight-target");
				const to = $elem
					.find('span.fw-medium:contains("To")')
					.next("a")
					.attr("data-highlight-target");
				const amount = $elem
					.find('span.fw-medium:contains("For")')
					.next("span")
					.text();
				const tokenElement = $elem.find('a[href*="/token/"]').last();
				const tokenName = tokenElement
					.find('span[data-bs-toggle="tooltip"]')
					.first()
					.text()
					.trim();

				const symbol = tokenElement
					.find("span > span.text-muted > span")
					.first()
					.text()
					.trim();

				const icon = tokenElement.find("img").attr("src");

				tokensTransferred.push({
					from,
					to,
					amount,
					symbol,
					network: "polygon",
					token: tokenName,
					icon: icon ? `${baseUrl}${icon}` : null,
				});
			});
		} catch (error) {}

		const status = $(
			"#ContentPlaceHolder1_maintable > div.card.p-5 > div:nth-child(2) span.badge"
		)
			.text()
			.split(" ")[0]
			.trim();

		const block = $(
			"#ContentPlaceHolder1_maintable > div.card.p-5 > div:nth-child(3) > div.col-md-9 > div > span.d-flex.align-items-center.gap-1 > a"
		).text();

		const timestamp2 = $(
			"#ContentPlaceHolder1_divTimeStamp > div > div.col-md-9"
		)
			.text()
			.trim()
			.replace(/\n/g, "")
			.split("|")[0]
			.split(" (")[0];

		const timestamp = $(
			"#ContentPlaceHolder1_divTimeStamp > div > div.col-md-9"
		)
			.text()
			.trim()
			.split("|")[0];

		const date = $("#ContentPlaceHolder1_divTimeStamp > div > div.col-md-9")
			.text()
			.trim()
			.replace(/\n/g, "")
			.split("|")[0]
			.split(" (")[1]
			.replace(" AM UTC)", "")
			.replace(" PM UTC)", "");

		const from_a = $(
			"#ContentPlaceHolder1_maintable div.from-address-col"
		).html();

		const from_div = cheerio.load(from_a);

		const from = from_div("a.js-clipboard").attr("data-clipboard-text");
		///en pruba 9
		const to_a = $("#ContentPlaceHolder1_maintable div.to-address-col").html();

		const to_div = cheerio.load(to_a);

		const to = to_div("a.js-clipboard").attr("data-clipboard-text");

		const amount = $("#ContentPlaceHolder1_spanValue > div > span:nth-child(2)")
			.text()
			.replace("POL", "")
			.trim();

		const fiatAmount = $(
			"#ContentPlaceHolder1_spanValue > div > span.text-muted"
		)
			.text()
			.replace("($", "")
			.replace(")", "")
			.trim();

		const transactionFeeNetwork = $(
			"#ContentPlaceHolder1_spanTxFee > div > span:nth-child(1)"
		)
			.text()
			.replace("POL", "")
			.trim();

		const transactionFeeFiat = $(
			"#ContentPlaceHolder1_spanTxFee > div > span.text-muted"
		)
			.text()
			.replace("($", "")
			.replace(")", "")
			.trim();

		const gasPriceGwei = $("#ContentPlaceHolder1_spanGasPrice")
			.text()
			.split("Gwei");

		const gasPrice = gasPriceGwei[0].trim();
		const gwei = gasPriceGwei[1]
			.replace("(", "")
			.replace(")", "")
			.replace("POL", "")
			.trim();

		const observation = $(
			"#ContentPlaceHolder1_spanValue > div > span:nth-child(4) > span"
		)
			.text()
			.replace("[", "")
			.replace("]", "")
			.trim();

		const response = {
			transactionType,
			hash: id,
			id,
			status,
			block,
			timestamp,
			network: "polygon",
			symbol: "POL",
			image:
				"https://polygonscan.com/assets/svg/logos/polygon-default-logo.svg",
			age: timestamp2,
			date: moment(date, "MMM-DD-YYYY HH:mm:ss").format("YYYY-MM-DD HH:mm:ss"),
			from,
			to,
			amount: Number(amount),
			fiatAmount: Number(fiatAmount),
			transactionFeeNetwork,
			transactionFeeFiat: Number(transactionFeeFiat),
			gasPrice,
			gwei,
			observation,
			tokensTransferred,
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
		const { data } = await instance.get(
			`${baseUrl}/txs?a=${address}&ps=${show}`,
			{
				headers: {
					"user-agent":
						"Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/127.0.0.0 Safari/537.36",
					"Upgrade-Insecure-Requests": "1",
				},
			}
		);

		const $ = cheerio.load(data);

		const transactions = JSON.parse(
			data.split("quickExportTransactionListData = '")[1].split("';")[0]
		);

		const formatTransactions = (address, transactions) => {
			return transactions.map((tx) => {
				return {
					hash: tx.Txhash,
					method: tx.Method,
					block: tx.Blockno,
					age: moment(tx.DateTime).fromNow(),
					date: tx.DateTime,
					from: tx.Sender,
					to: tx.Receiver,
					traffic: determineTraffic(address, tx.Sender, tx.Receiver),
					fiatAmount: tx.Value.replace("$", ""),
					amount: tx.Amount.split(" ")[0].replace(",", ""),
					asset: "POL",
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
		const records = $(
			"#ContentPlaceHolder1_divDataInfo > div > div:nth-child(1) > span"
		)
			.text()
			.match(/\d+/g)
			.join("");
		const nPage = $(
			"#ContentPlaceHolder1_divBottomPagination > nav > ul > li:nth-child(3)"
		)
			.text()
			.replace("Page", "")
			.split("of");

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

function cleanString(str) {
	return str
		.replace(/✅/g, "") // Elimina el emoji ✅
		.replace(/\[.*?\]/g, "") // Elimina cualquier texto dentro de corchetes [ ... ]
		.replace(/claim at:|until \d{2}\.\d{2}/gi, "") // Elimina frases específicas
		.replace(/\s+/g, " ") // Reemplaza múltiples espacios por uno solo
		.trim(); // Elimina espacios al inicio y al final
}

const _parseTransactionsContent = (campos, element, transactions = []) => {
	const transaction = {};

	transaction.hash = campos(element).find("td:nth-child(2) a").text().trim();
	transaction.method = campos(element)
		.find("td:nth-child(3) span")
		.attr("data-title");
	transaction.block = campos(element).find("td:nth-child(4) a").text();

	const ageCol = campos(element).find("td:nth-child(6) span");
	const dateCol = campos(element).find("td:nth-child(5) span");

	const age = ageCol.text().trim();
	const date = dateCol.text().trim();

	transaction.age = age;
	transaction.date = date;

	const divFrom = campos(element).find("td:nth-child(8)").html();

	if (!divFrom) return;

	const from = cheerio.load(divFrom);

	transaction.from = from("a.js-clipboard").attr("data-clipboard-text");
	transaction.traffic = campos(element).find("td:nth-child(9)").text();

	const divTo = campos(element).find("td:nth-child(10)").html();
	const to = cheerio.load(divTo);

	transaction.to = to("a.js-clipboard").attr("data-clipboard-text");

	const amountCol = campos(element).find("td:nth-child(11)");

	const amountTooltipData = amountCol.find("span").attr("data-bs-title");

	const fiatAndTokenAmount = amountTooltipData.split(" | ");
	const tokenAmountAndAsset = fiatAndTokenAmount[0].split(" ");

	const tokenAmount = tokenAmountAndAsset[0].trim();
	const asset = tokenAmountAndAsset[1].trim();

	const fiatAmount = fiatAndTokenAmount[1].replace("$", "").trim();

	transaction.fiatAmount = fiatAmount;
	transaction.amount = tokenAmount;
	transaction.asset = asset;
	transaction.txnFee = campos(element)
		.find("td.small.text-muted.showTxnFee")
		.text();

	transactions.push(transaction);
};

module.exports = {
	getBalance,
	getGasTracker,
	getTransactionsList,
	getTransactionStatus,
};
