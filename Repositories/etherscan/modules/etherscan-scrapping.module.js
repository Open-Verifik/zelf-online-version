const { getCleanInstance } = require("../../../Core/axios");
const instance = getCleanInstance(30000);
const cheerio = require("cheerio");

const baseUrls = {
	production: "https://etherscan.io",
	development: "https://sepolia.etherscan.io",
};

/**
 * @param {*} params
 */

const getAddress = async (params) => {
	const baseUrl = baseUrls[params.env || "production"];

	try {
		const address = params.address;

		const { data } = await instance.get(`${baseUrl}/address/${address}`, {
			headers: {
				"user-agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/127.0.0.0 Safari/537.36",
				"Upgrade-Insecure-Requests": "1",
			},
		});
		const $ = cheerio.load(data);

		const fullName = $("#ensName > span > a > div > span").text().replace(/\n/g, "");

		const balance = $("#ContentPlaceHolder1_divSummary > div.row.g-3.mb-4 > div:nth-child(1) > div > div > div:nth-child(2) > div")
			.text()
			.replace(/\n/g, "")
			.replace(" ETH", "");

		const accounts = $("#ContentPlaceHolder1_divSummary > div.row.g-3.mb-4 > div:nth-child(1) > div > div > div:nth-child(3)")
			.text()
			.replace(/\n/g, "")
			.split("@");

		let account;

		try {
			account = {
				asset: "ETH",
				fiatValue: accounts[0].replace("Eth Value$", "").replace("(", "").replace(",", "").trim(),
				price: accounts[1].replace("$", "").replace("/ETH)", "").replace(",", "").trim(),
			};
		} catch (error) {
			//si no tiene nada
			account = {
				asset: "ETH",
				fiatValue: "0.00",
				price: "0.00",
			};
		}

		const totalTokens = $("#dropdownMenuBalance").text().replace(/\n/g, "").split("(");

		let tokensContras;

		try {
			tokensContras = {
				balance: totalTokens[0].replace("$", ""),
				tokenTotal: totalTokens[1].replace("Tokens)", "").trim(),
			};
		} catch (error) {
			//si no tiene nada
			tokensContras = {
				balance: "0.00",
				tokenTotal: "0.00",
			};
		}

		const tokens = [];

		let currentTokenType = "";

		$("ul.list li.nav-item").each((index, element) => {
			const tokenTypeElement = $(element).find(".fw-medium").text().trim();

			if (tokenTypeElement) {
				currentTokenType = tokenTypeElement.replace("Tokens", "").split("(")[0].trim();
				return;
			}

			const tokenName = $(element).find(".list-name span").attr("data-bs-title") || $(element).find(".list-name").text().trim();

			const tokenAmount = $(element).find(".text-muted").text().trim();

			const [_amount, rest] = tokenAmount.split(" ");

			// Then, split the second part on '@' to isolate the price
			const [, _price] = tokenAmount.split("@");

			const tokenType = $(element).find(".badge").text().trim();

			const tokenLink = $(element).find("a.nav-link").attr("href").replace("/token/", "");

			const tokenImage = $(element).find("img").attr("src");

			let name = null;

			let symbol = null;

			try {
				name = tokenName.split("(")[0].trim();
				symbol = tokenName.split("(")[1].replace(")", "").trim();
			} catch (error) {}

			if (name && tokenImage) {
				const token = {
					tokenType: currentTokenType,
					name: name,
					symbol: symbol,
					amount: _amount,
					price: _price,
					type: tokenType,
					address: tokenLink,
					image: tokenImage.includes("https") ? tokenImage : `${baseUrl}${tokenImage}`,
				};

				tokens.push(token);
			}
		});

		const tokenHoldings = {
			tokensContras,
			tokens,
		};

		const transactions = [];

		try {
			const tabla = $("#transactions > div > div.table-responsive").html();

			const campos = cheerio.load(tabla);

			campos("tbody tr").each((index, element) => {
				const transaction = {};

				transaction.hash = campos(element).find("td:nth-child(2) a").text().trim();

				transaction.method = campos(element).find("td:nth-child(3) span").attr("data-title");

				transaction.block = campos(element).find("td:nth-child(4) a").text();

				transaction.age = campos(element).find("td:nth-child(5) span").attr("data-bs-title");

				const divFrom = campos(element).find("td:nth-child(8)").html();

				if (!divFrom) return;

				const from = cheerio.load(divFrom);

				transaction.from = from("a.js-clipboard").attr("data-clipboard-text");

				transaction.traffic = campos(element).find("td:nth-child(9)").text();

				const divTo = campos(element).find("td:nth-child(10)").html();

				const to = cheerio.load(divTo);

				transaction.to = to("a.js-clipboard").attr("data-clipboard-text");

				let _amount = campos(element).find("td:nth-child(11)").text().split("$")[0].trim();

				_amount = _amount.split(" ");

				transaction.fiatAmount = campos(element).find("td:nth-child(11)").text().split("$")[1].replace(/\n/g, "");

				transaction.amount = _amount[0];

				transaction.asset = _amount[1];

				transaction.txnFee = campos(element).find("td.small.text-muted.showTxnFee").text();

				transactions.push(transaction);
			});
		} catch (error) {
			console.error({ error });
		}

		const response = {
			address,
			fullName,
			balance,
			account,
			tokenHoldings,
			transactions,
		};

		return response;
	} catch (error) {
		console.error({ error });
	}
};

const getGasTracker = async (params) => {
	const baseUrl = baseUrls[params.env || "production"];

	try {
		const { data } = await instance.get(`${baseUrl}/gastracker`, {
			headers: {
				"user-agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/127.0.0.0 Safari/537.36",
				"Upgrade-Insecure-Requests": "1",
			},
		});

		const $ = cheerio.load(data);

		const lowGwei = $("#spanLowPrice").text().replace(/\n/g, "");
		const averageGwei = $("#spanAvgPrice").text().replace(/\n/g, "");
		const highGwei = $("#spanHighPrice").text().replace(/\n/g, "");

		const lowData = $("#divLowPrice > div > div.text-muted").text().split("\n\n");
		const lowBasePriority = lowData[1].split("|");
		const lowBase = lowBasePriority[0].replace("Base:", "").trim();
		const lowPriority = lowBasePriority[1].replace("Priority:", "").trim();
		const lowCostTime = lowData[2].split("|");
		const lowCost = lowCostTime[0].replace("$", "").trim();
		const lowTime = lowCostTime[1].replace("~", "").trim();

		const averageData = $("#divAvgPrice > div > div.text-muted").text().split("\n\n");
		const averageBasePriority = averageData[1].split("|");
		const averageBase = averageBasePriority[0].replace("Base:", "").trim();
		const averagePriority = averageBasePriority[1].replace("Priority:", "").trim();
		const averageCostTime = averageData[2].split("|");
		const averageCost = averageCostTime[0].replace("$", "").trim();
		const averageTime = averageCostTime[1].replace("~", "").trim();

		const highData = $("#divHighPrice > div > div.text-muted").text().split("\n\n");
		const highBasePriority = highData[1].split("|");
		const highBase = highBasePriority[0].replace("Base:", "").trim();
		const highPriority = highBasePriority[1].replace("Priority:", "").trim();
		const highCostTime = highData[2].split("|");
		const highCost = highCostTime[0].replace("$", "").trim();
		const highTime = highCostTime[1].replace("~", "").trim();

		const featuredActions = [];

		$("#content > section.container-xxl.pb-16 > div.row.g-4.mb-4 > div:nth-child(2) > div > div > div:nth-child(2) > div > table tr").each(
			(index, element) => {
				const action = $(element).find("td span").text().trim();
				const low = $(element).find("td").eq(1).text().replace("$", "").trim();
				const average = $(element).find("td").eq(2).text().replace("$", "").trim();
				const high = $(element).find("td").eq(3).text().replace("$", "").trim();

				if (action)
					featuredActions.push({
						action,
						low,
						average,
						high,
					});
			}
		);

		const response = {
			low: {
				gwei: lowGwei,
				base: lowBase,
				Priority: lowPriority,
				cost: lowCost,
				time: lowTime,
			},
			average: {
				gwei: averageGwei,
				base: averageBase,
				Priority: averagePriority,
				cost: averageCost,
				time: averageTime,
			},
			high: {
				gwei: highGwei,
				base: highBase,
				Priority: highPriority,
				cost: highCost,
				time: highTime,
			},
			featuredActions,
		};

		return response;
	} catch (error) {
		console.log({ error: error });
	}
};

/**
 * get transaction status
 * @param {Object} params
 */
const getTransactionStatus = async (params) => {
	try {
		const id = params.id;

		const { data } = await instance.get(`https://etherscan.io/tx/${id}`, {
			headers: {
				"user-agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/127.0.0.0 Safari/537.36",
				"Upgrade-Insecure-Requests": "1",
			},
		});

		const $ = cheerio.load(data);

		const status = $("#ContentPlaceHolder1_maintable > div.card.p-5.mb-3 > div.row.align-items-center.mb-4 > div.col.col-md-9 > span")
			.text()
			.split(" ")[0]
			.trim();

		const block = $(
			"#ContentPlaceHolder1_maintable > div.card.p-5.mb-3 > div:nth-child(3) > div.col-md-9 > div > span.d-flex.align-items-center.gap-1 > a"
		).text();

		const timestamp = $("#ContentPlaceHolder1_divTimeStamp > div > div.col-md-9").text().replace(/\n/g, "").split("|")[0];

		const from_a = $("#ContentPlaceHolder1_maintable > div.card.p-5.mb-3 > div:nth-child(10) > div.col-md-9").html();

		const from_div = cheerio.load(from_a);

		const from = from_div("a.js-clipboard").attr("data-clipboard-text");

		const to_a = $("#ContentPlaceHolder1_maintable > div.card.p-5.mb-3 > div:nth-child(11) > div.col-md-9 > div").html();

		const to_div = cheerio.load(to_a);

		const to = to_div("a.js-clipboard").attr("data-clipboard-text");

		const valueETH = $("#ContentPlaceHolder1_spanValue > div > span:nth-child(2)").text().replace("ETH", "").trim();

		const valueDolar = $("#ContentPlaceHolder1_spanValue > div > span.text-muted").text().replace("($", "").replace(")", "").trim();

		const transactionFeeETH = $("#ContentPlaceHolder1_spanTxFee > div > span:nth-child(1)").text().replace("ETH", "").trim();

		const transactionFeeDolar = $("#ContentPlaceHolder1_spanTxFee > div > span.text-muted").text().replace("($", "").replace(")", "").trim();

		const gasPriceGwei = $("#ContentPlaceHolder1_spanGasPrice").text().split("Gwei");

		const gasPrice = gasPriceGwei[0].trim();
		const gweiETH = gasPriceGwei[1].replace("(", "").replace(")", "").replace("ETH", "").trim();

		const observation = $("#ContentPlaceHolder1_spanValue > div > span:nth-child(4) > span").text().replace("[", "").replace("]", "").trim();

		const response = {
			id,
			status,
			block,
			timestamp,
			from,
			to,
			valueETH,
			valueDolar,
			transactionFeeETH,
			transactionFeeDolar,
			gasPrice,
			gweiETH,
			observation,
		};

		if (!id || !status || !to || !from) {
			throw new Error("404");
		}

		return response;
	} catch (exception) {
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
const getTransactionsList = async (params) => {
	const address = params.address;

	const page = params.page;

	const show = params.show;

	const baseUrl = baseUrls[params.env || "production"];

	try {
		const { data } = await instance.get(`${baseUrl}/txs?a=${address}&ps=${show}&p=${page}`, {
			headers: {
				"user-agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/127.0.0.0 Safari/537.36",
				"Upgrade-Insecure-Requests": "1",
			},
		});
		const $ = cheerio.load(data);

		const transactions = [];

		const records = $("#ContentPlaceHolder1_divDataInfo > div > div:nth-child(1) > span").text().match(/\d+/g).join("");

		const nPage = $("#ContentPlaceHolder1_divBottomPagination > nav > ul > li:nth-child(3)").text().replace("Page", "").split("of");

		const pagination = {
			records,
			pages: nPage[1].trim(),
			page: nPage[0].trim(),
		};

		try {
			const tabla = $("#ContentPlaceHolder1_divTransactions > div.table-responsive").html();

			const campos = cheerio.load(tabla);

			campos("tbody tr").each((index, element) => {
				const transaction = {};

				transaction.hash = campos(element).find("td:nth-child(2) a").text().trim();

				transaction.method = campos(element).find("td:nth-child(3) span").attr("data-title");

				transaction.block = campos(element).find("td:nth-child(4) a").text();

				transaction.age = campos(element).find("td:nth-child(5) span").attr("data-bs-title");

				const divFrom = campos(element).find("td:nth-child(8)").html();

				const from = cheerio.load(divFrom);

				transaction.from = from("a.js-clipboard").attr("data-clipboard-text");

				transaction.traffic = campos(element).find("td:nth-child(9)").text();

				const divTo = campos(element).find("td:nth-child(10)").html();

				const to = cheerio.load(divTo);

				transaction.to = to("a.js-clipboard").attr("data-clipboard-text");

				let _amount = campos(element).find("td:nth-child(11)").text().split("$")[0].trim();

				_amount = _amount.split(" ");

				transaction.fiatAmount = campos(element).find("td:nth-child(11)").text().split("$")[1].replace(/\n/g, "");

				transaction.amount = _amount[0];

				transaction.asset = _amount[1];

				transaction.txnFee = campos(element).find("td.small.text-muted.showTxnFee").text();

				transactions.push(transaction);
			});
		} catch (error) {}

		return { pagination, transactions };
	} catch (error) {
		return {
			pagination: { records: "0", pages: "0", page: "0" },
			transactions: [],
		};
	}
};

module.exports = {
	getAddress,
	getGasTracker,
	getTransactionsList,
	getTransactionStatus,
};
