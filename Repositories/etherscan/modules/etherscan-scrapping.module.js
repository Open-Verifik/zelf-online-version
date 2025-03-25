const { getCleanInstance } = require("../../../Core/axios");
const instance = getCleanInstance(30000);
const cheerio = require("cheerio");
const { token } = require("../../../Core/config");
const { getTickerPrice } = require("../../binance/modules/binance.module");
const baseUrls = {
	production: "https://etherscan.io",
	development: "https://sepolia.etherscan.io",
};

/**
 * @param {*} params
 */
const environment = "production";
const getAddress = async (params) => {
	try {
		const baseUrl = baseUrls[params.env || environment];

		const html = await instance.get(`${baseUrl}/address/${params.address}`, {
			headers: {
				"user-agent":
					"Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/127.0.0.0 Safari/537.36",
				"Upgrade-Insecure-Requests": "1",
			},
		});
		const $ = cheerio.load(html.data);

		const fullName = $("#ensName > span > a > div > span")
			.text()
			.replace(/\n/g, "");

		const address = $("#mainaddress").text().trim();

		const { data } = await instance.get(
			`https://api.ethplorer.io/getAddressInfo/${address}?apiKey=ebexplorer7627Gsgp87`,
			{}
		);

		let tokens = [];

		function formatTokenData(tokens) {
			return tokens.map((token) => {
				const { tokenInfo, balance, rawBalance } = token;
				const rate = tokenInfo.price?.rate || 0;
				const decimals = parseInt(tokenInfo.decimals, 10);
				const formattedAmount = parseFloat(rawBalance) / Math.pow(10, decimals);
				const fiatBalance = formattedAmount * rate;

				return {
					tokenType: "ERC-20",
					fiatBalance: parseFloat(fiatBalance.toFixed(7)),
					_fiatBalance: fiatBalance.toFixed(7),
					symbol: tokenInfo.symbol,
					name: tokenInfo.name,
					price: rate.toFixed(6),
					_price: rate,
					image: `https://images.ctfassets.net/gcj8jwzm6086/${tokenInfo.image
						.split("/")
						.pop()
						.replace(".png", "")}.png`,
					decimals: decimals,
					amount: formattedAmount.toFixed(12),
					_amount: formattedAmount,
					address: tokenInfo.address,
				};
			});
		}
		const fiatBalance =
			(await getTickerPrice({ symbol: `ETH` })).price * data.ETH.balance;

		function sumFiatBalance(tokens) {
			return tokens.reduce((total, token) => total + token.fiatBalance, 0);
		}

		tokens = formatTokenData(data.tokens);

		const transactions = [];

		try {
			const tabla = $("#transactions > div > div.table-responsive").html();

			const campos = cheerio.load(tabla);

			campos("tbody tr").each((index, element) => {
				const transaction = {};

				transaction.hash = campos(element)
					.find("td:nth-child(2) a")
					.text()
					.trim();

				transaction.method = campos(element)
					.find("td:nth-child(3) span")
					.attr("data-title");

				transaction.block = campos(element).find("td:nth-child(4) a").text();

				transaction.age = campos(element)
					.find("td:nth-child(5) span")
					.attr("data-bs-title");

				const divFrom = campos(element).find("td:nth-child(8)").html();

				if (!divFrom) return;

				const from = cheerio.load(divFrom);

				transaction.from = from("a.js-clipboard").attr("data-clipboard-text");

				transaction.traffic = campos(element).find("td:nth-child(9)").text();

				const divTo = campos(element).find("td:nth-child(10)").html();

				const to = cheerio.load(divTo);

				transaction.to = to("a.js-clipboard").attr("data-clipboard-text");

				let _amount = campos(element)
					.find("td:nth-child(11)")
					.text()
					.split("$")[0]
					.trim();

				_amount = _amount.split(" ");

				transaction.fiatAmount = campos(element)
					.find("td:nth-child(11)")
					.text()
					.split("$")[1]
					.replace(/\n/g, "");

				transaction.amount = _amount[0];

				transaction.asset = _amount[1];

				transaction.txnFee = campos(element)
					.find("td.small.text-muted.showTxnFee")
					.text();

				transactions.push(transaction);
			});
		} catch (error) {
			console.error({ error });
		}

		const response = {
			address: data.address,
			fullName,
			balance: data.ETH.balance.toString(),
			_balance: parseFloat(Number(data.ETH.balance).toFixed(12)),
			fiatBalance,
			decimals: contarDecimales(data.ETH.balance.toString()),
			account: {
				asset: "ETH",
				fiatBalance: fiatBalance.toString(),
				price: data.ETH.price.rate,
			},
			tokenHoldings: {
				balance: sumFiatBalance(formatTokenData(data.tokens)).toString(),
				total: tokens.length,
				tokens: tokens,
			},
			transactions,
		};

		return response;
	} catch (error) {
		console.error({ error });
	}
};

function contarDecimales(numero) {
	const partes = numero.toString().split(".");
	return partes[1] ? partes[1].length : 0;
}
const getGasTracker = async (params) => {
	const baseUrl = baseUrls[params.env || environment];

	try {
		let { data } = await instance.get(`${baseUrl}/gastracker`, {
			headers: {
				"user-agent":
					"Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/127.0.0.0 Safari/537.36",
				"Upgrade-Insecure-Requests": "1",
			},
		});

		const $ = cheerio.load(data);

		data = data.split("const costTxActionData =")[1].trim();
		data = data.split("$('#mytable3').DataTable({")[0].trim();

		const lowGwei = $("#spanLowPrice").text().replace(/\n/g, "").trim();
		const averageGwei = $("#spanAvgPrice").text().replace(/\n/g, "").trim();
		const highGwei = $("#spanHighPrice").text().replace(/\n/g, "").trim();

		const lowPriorityAndBase = $("#spanLowPriorityAndBase").text().trim();
		const lowTime = $('span[data-bs-trigger="hover"]')
			.first()
			.text()
			.replace("~ ", "")
			.trim();
		const priceInDollars = $("div.text-muted")
			.text()
			.match(/\$\d+\.\d+/)[0];

		const lowNumbers = lowPriorityAndBase.match(/\d+(\.\d+)?/g);
		const lowBase = parseFloat(lowNumbers[0]).toString();
		const lowPriority = parseFloat(lowNumbers[1]).toString();

		const avgPriorityAndBase = $("#spanProposePriorityAndBase").text().trim();
		const averageTime = $('span[data-bs-trigger="hover"]')
			.eq(1)
			.text()
			.replace("~ ", "")
			.trim();
		const avgPriceInDollars = $("div.text-muted")
			.text()
			.match(/\$\d+\.\d+/)[0];
		const avgNumbers = avgPriorityAndBase.match(/\d+(\.\d+)?/g);
		const avgBase = parseFloat(avgNumbers[0]).toString();
		const avgPriority = parseFloat(avgNumbers[1]).toString();

		const highPriorityAndBase = $("#spanHighPriorityAndBase").text().trim();
		const highTime = $('span[data-bs-trigger="hover"]')
			.eq(2)
			.text()
			.replace("~ ", "")
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

		const baseUrl = baseUrls[params.env || environment];

		const { data } = await instance.get(`${baseUrl}/tx/${id}`, {
			headers: {
				"user-agent":
					"Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/127.0.0.0 Safari/537.36",
				"Upgrade-Insecure-Requests": "1",
			},
		});

		const $ = cheerio.load(data);

		const status = $(
			"#ContentPlaceHolder1_maintable > div.card.p-5.mb-3 > div.row.align-items-center.mb-4 > div.col.col-md-9 > span"
		)
			.text()
			.split(" ")[0]
			.trim();

		const block = $(
			"#ContentPlaceHolder1_maintable > div.card.p-5.mb-3 > div:nth-child(3) > div.col-md-9 > div > span.d-flex.align-items-center.gap-1 > a"
		).text();

		const timestamp = $(
			"#ContentPlaceHolder1_divTimeStamp > div > div.col-md-9"
		)
			.text()
			.trim()
			.replace(/\n/g, "")
			.split("|")[0];

		///en pruba 8
		const from_a = $(
			"#ContentPlaceHolder1_maintable > div.card.p-5.mb-3 > div:nth-child(10) > div.col-md-9"
		).html();

		const from_div = cheerio.load(from_a);

		const from = from_div("a.js-clipboard").attr("data-clipboard-text");
		///en pruba 9
		const to_a = $(
			"#ContentPlaceHolder1_maintable > div.card.p-5.mb-3 > div:nth-child(11) > div.col-md-9 > div"
		).html();

		const to_div = cheerio.load(to_a);

		const to = to_div("a.js-clipboard").attr("data-clipboard-text");

		const valueETH = $(
			"#ContentPlaceHolder1_spanValue > div > span:nth-child(2)"
		)
			.text()
			.replace("ETH", "")
			.trim();

		const valueDolar = $(
			"#ContentPlaceHolder1_spanValue > div > span.text-muted"
		)
			.text()
			.replace("($", "")
			.replace(")", "")
			.trim();

		const transactionFeeETH = $(
			"#ContentPlaceHolder1_spanTxFee > div > span:nth-child(1)"
		)
			.text()
			.replace("ETH", "")
			.trim();

		const transactionFeeDolar = $(
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
		const gweiETH = gasPriceGwei[1]
			.replace("(", "")
			.replace(")", "")
			.replace("ETH", "")
			.trim();

		const observation = $(
			"#ContentPlaceHolder1_spanValue > div > span:nth-child(4) > span"
		)
			.text()
			.replace("[", "")
			.replace("]", "")
			.trim();

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

	const baseUrl = baseUrls[params.env || environment];

	try {
		const { data } = await instance.get(
			`${baseUrl}/txs?a=${address}&ps=${show}&p=${page}`,
			{
				headers: {
					"user-agent":
						"Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/127.0.0.0 Safari/537.36",
					"Upgrade-Insecure-Requests": "1",
				},
			}
		);
		const $ = cheerio.load(data);

		const transactions = [];

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
			pages: nPage ? nPage[1].trim() : 0,
			page: nPage ? nPage[0].trim() : 0,
		};

		const tabla = $(
			"#ContentPlaceHolder1_divTransactions > div.table-responsive"
		).html();

		const campos = cheerio.load(tabla);

		campos("tbody tr").each((index, element) => {
			const transaction = {};

			transaction.hash = campos(element)
				.find("td:nth-child(2) a")
				.text()
				.trim();

			transaction.method = campos(element)
				.find("td:nth-child(3) span")
				.attr("data-title");

			transaction.block = campos(element).find("td:nth-child(4) a").text();

			transaction.age = campos(element)
				.find("td:nth-child(5) span")
				.attr("data-bs-title");

			const divFrom = campos(element).find("td:nth-child(8)").html();

			const from = cheerio.load(divFrom);

			transaction.from = from("a.js-clipboard").attr("data-clipboard-text");

			transaction.traffic = campos(element).find("td:nth-child(9)").text();

			const divTo = campos(element).find("td:nth-child(10)").html();

			const to = cheerio.load(divTo);

			transaction.to = to("a.js-clipboard").attr("data-clipboard-text");

			let _amount = campos(element)
				.find("td:nth-child(11)")
				.text()
				.split("$")[0]
				.trim();

			_amount = _amount.split(" ");

			transaction.fiatAmount = campos(element)
				.find("td:nth-child(11)")
				.text()
				.split("$")[1]
				.replace(/\n/g, "");

			transaction.amount = _amount[0];

			transaction.asset = _amount[1];

			transaction.txnFee = campos(element)
				.find("td.small.text-muted.showTxnFee")
				.text();

			transactions.push(transaction);
		});

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
