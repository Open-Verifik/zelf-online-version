require("dotenv").config();

const axios = require("axios");
const moment = require("moment");
const https = require("https");
const cheerio = require("cheerio");

const { idAseet_ } = require("../../dataAnalytics/modules/dataAnalytics.module");
const { getCleanInstance } = require("../../../Core/axios");
const { getTickerPrice } = require("../../binance/modules/binance.module");
const { get_ApiKey } = require("../../Solana/modules/oklink");

const instance = getCleanInstance(30000);
const agent = new https.Agent({ rejectUnauthorized: false });
const apiKey = process.env.API_KEY_ETH;

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
		const address = params.address;

		const { data } = await instance.get(`https://api.ethplorer.io/getAddressInfo/${address}?apiKey=${apiKey}`, {});

		const { price: price } = await getTickerPrice({ symbol: "ETH" });

		async function formatTokenData(tokens, params) {
			const formattedTokens = await Promise.all(
				tokens.map(async (token) => {
					const { tokenInfo, balance, rawBalance } = token;
					const rate = tokenInfo.price?.rate || 0;
					const decimals =
						parseInt(tokenInfo.decimals).toString().length > 3
							? Number(String(parseInt(tokenInfo.decimals)).slice(0, 2))
							: parseInt(tokenInfo.decimals);
					const formattedAmount = parseFloat(rawBalance) / Math.pow(10, decimals);
					const fiatBalance = formattedAmount * rate;
					let idAseet;
					try {
						idAseet = await idAseet_(tokenInfo.symbol);
					} catch (error) {
						idAseet = {};
					}

					return {
						tokenType: "ERC-20",
						fiatBalance: parseFloat(fiatBalance.toFixed(7)),
						_fiatBalance: fiatBalance.toFixed(7),
						symbol: tokenInfo.symbol,
						name: tokenInfo.name,
						price: rate.toFixed(6),
						_price: rate,
						image: `https://s2.coinmarketcap.com/static/img/coins/64x64/${idAseet.idAseet}.png`,
						decimals: decimals,
						amount: formattedAmount.toFixed(12),
						_amount: formattedAmount,
						address: tokenInfo.address,
					};
				})
			);

			return formattedTokens;
		}

		const tokens = await formatTokenData(data.tokens);

		tokens.push({
			tokenType: "ETH",
			fiatBalance: data.ETH.balance * price,
			symbol: "ETH",
			name: "Ethereum",
			price: price,
			image: "https://dynamic-assets.coinbase.com/dbb4b4983bde81309ddab83eb598358eb44375b930b94687ebe38bc22e52c3b2125258ffb8477a5ef22e33d6bd72e32a506c391caa13af64c00e46613c3e5806/asset_icons/4113b082d21cc5fab17fc8f2d19fb996165bcce635e6900f7fc2d57c4ef33ae9.png",
			amount: data.ETH.balance.toString(),
		});

		function sumFiatBalance(tokens) {
			return tokens.reduce((total, token) => total + token.fiatBalance, 0);
		}
		const { transactions } = await getTransactionsList({
			address,
			page: "1",
			show: "10",
		});

		const fiatBalance = data.ETH.balance * price;
		const response = {
			address,
			balance: data.ETH.balance,
			fiatBalance,
			type: "system_account",
			account: {
				asset: "ETH",
				fiatBalance: fiatBalance.toString(),
				price,
			},
			tokenHoldings: {
				total: tokens.length,
				balance: sumFiatBalance(tokens).toString(),
				tokens,
			},
			transactions,
		};

		return response;
	} catch (error) {
		console.error({ error });
	}
};

const getGasTracker = async (params) => {
	const baseUrl = baseUrls[params.env || environment];

	try {
		let { data } = await instance.get(`${baseUrl}/gastracker`, {
			headers: {
				"user-agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/127.0.0.0 Safari/537.36",
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
		const lowTime = $('span[data-bs-trigger="hover"]').first().text().replace("~ ", "").trim();
		const priceInDollars = $("div.text-muted")
			.text()
			.match(/\$\d+\.\d+/)[0];

		const lowNumbers = lowPriorityAndBase.match(/\d+(\.\d+)?/g);
		const lowBase = parseFloat(lowNumbers[0]).toString();
		const lowPriority = parseFloat(lowNumbers[1]).toString();

		const avgPriorityAndBase = $("#spanProposePriorityAndBase").text().trim();
		const averageTime = $('span[data-bs-trigger="hover"]').eq(1).text().replace("~ ", "").trim();
		const avgPriceInDollars = $("div.text-muted")
			.text()
			.match(/\$\d+\.\d+/)[0];
		const avgNumbers = avgPriorityAndBase.match(/\d+(\.\d+)?/g);
		const avgBase = parseFloat(avgNumbers[0]).toString();
		const avgPriority = parseFloat(avgNumbers[1]).toString();

		const highPriorityAndBase = $("#spanHighPriorityAndBase").text().trim();
		const highTime = $('span[data-bs-trigger="hover"]').eq(2).text().replace("~ ", "").trim();
		const highPriceInDollars = $("div.text-muted")
			.text()
			.match(/\$\d+\.\d+/)[0];
		const highNumbers = highPriorityAndBase.match(/\d+(\.\d+)?/g);
		const highBase = parseFloat(highNumbers[0]).toString();
		const highPriority = parseFloat(highNumbers[1]).toString();

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
				"user-agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/127.0.0.0 Safari/537.36",
				"Upgrade-Insecure-Requests": "1",
			},
		});

		const $ = cheerio.load(data);

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

		const valueETH = $("#ContentPlaceHolder1_spanValue > div > span:nth-child(2)").text().replace("ETH", "").trim();

		const valueDolar = $("#ContentPlaceHolder1_spanValue > div > span.text-muted").text().replace("($", "").replace(")", "").trim();

		const transactionFeeETH = $("#ContentPlaceHolder1_spanTxFee > div > span:nth-child(1)").text().replace("ETH", "").trim();

		const transactionFeeDolar = $("#ContentPlaceHolder1_spanTxFee > div > span.text-muted").text().replace("($", "").replace(")", "").trim();

		const gasPriceGwei = $("#ContentPlaceHolder1_spanGasPrice").text().split("Gwei");

		const gasPrice = gasPriceGwei[0].trim();
		const gweiETH = gasPriceGwei[1].replace("(", "").replace(")", "").replace("ETH", "").trim();

		const observation = $("#ContentPlaceHolder1_spanValue > div > span:nth-child(4) > span").text().replace("[", "").replace("]", "").trim();

		const response = {
			hash: id,
			id,
			status,
			block,
			timestamp,
			age: timestamp2,
			date: moment(date, "MMM-DD-YYYY HH:mm:ss").format("YYYY-MM-DD HH:mm:ss"),
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
const getTransactionsList = async (params) => {
	const address = params.address;
	const page = params.page;
	const show = params.show;

	const baseUrl = baseUrls[params.env || environment];

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
			pages: nPage ? nPage?.[1]?.trim() : 0,
			page: nPage ? nPage?.[0]?.trim() : 0,
		};

		const tabla = $("#ContentPlaceHolder1_divTransactions > div.table-responsive").html();
		const campos = cheerio.load(tabla);

		campos("tbody tr").each((_index, element) => {
			const transaction = {};

			transaction.hash = campos(element).find("td:nth-child(2) a").text().trim();
			transaction.method = campos(element).find("td:nth-child(3) span").attr("data-title");

			transaction.block = campos(element).find("td:nth-child(5) a").text();
			//#ContentPlaceHolder1_divTransactions > div.table-responsive > table > tbody > tr:nth-child(1) > td.showAge
			transaction.age = campos(element).find("td.showAge").text();

			//#ContentPlaceHolder1_divTransactions > div.table-responsive > table > tbody > tr:nth-child(1) > td.showAge > span
			transaction.date = campos(element).find(" td.showAge > span").attr("data-bs-title");

			const divFrom = campos(element).find("td:nth-child(9)").html();

			const from = cheerio.load(divFrom);

			transaction.from = from("a.js-clipboard").attr("data-clipboard-text");

			transaction.traffic = campos(element).find("td:nth-child(10)").text();

			const divTo = campos(element).find("td:nth-child(11)").html();

			const to = cheerio.load(divTo);

			transaction.to = to("a.js-clipboard").attr("data-clipboard-text");

			let _amount = campos(element).find("td:nth-child(12)").text().split("$")[0].trim();

			_amount = _amount.split(" ");

			transaction.fiatAmount = campos(element).find("td:nth-child(12)").text().split("$")[1].replace(/\n/g, "").trim();
			transaction.amount = _amount[0];
			transaction.asset = _amount[1];
			transaction.txnFee = campos(element).find("td.small.text-muted.showTxnFee").text();

			transactions.push(transaction);
		});

		return { pagination, transactions };
	} catch (error) {
		console.error({ error, address });

		return {
			pagination: { records: "0", pages: "0", page: "0" },
			transactions: [],
		};
	}
};

/**
 * get transaction status v2
 * @param {Object} params
 */
const getTransactionStatusV2 = async (params) => {
	let transaction = null;

	try {
		const t = Date.now();

		const { id } = params;

		const url = `https://www.oklink.com/api/explorer/v1/eth/transactions/${id}?t=${t}`;

		const { data } = await axios.get(url, {
			httpsAgent: agent,
			headers: {
				"X-Apikey": get_ApiKey().getApiKey(),
				"User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/132.0.0.0 Safari/537.36",
			},
		});

		const details = data?.data;

		if (!details) return null;

		const type = details.inputHex === "0x" ? "transfer" : "swap";

		transaction = {
			age: moment(details.blocktime * 1000).fromNow(),
			amount: details.value.toString(),
			assetPrice: details.legalRate.toString(),
			block: details.blockHeigh,
			confirmations: details.confirm,
			date: moment(details.blocktime * 1000).format("YYYY-MM-DD HH:mm:ss"),
			from: details.from,
			gasPrice: details.gasPrice.toString(),
			hash: id,
			image: details.logoUrl,
			status: details.status === "0x1" ? "Success" : "fail",
			to: details.to,
			txnFee: details.fee.toString(),
			type,
		};

		if (type === "swap") {
			const transfersUrl = `https://www.oklink.com/api/explorer/v1/eth/transfers?limit=9999&offset=0&tokenType=ERC20&tranHash=${id}&t=${t}`;

			const response = await axios.get(transfersUrl, {
				httpsAgent: agent,
				headers: {
					"X-Apikey": get_ApiKey().getApiKey(),
					"User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/132.0.0.0 Safari/537.36",
				},
			});

			if (!response.data?.data?.hits) return transaction;

			for (let index = response.data.data.hits.length - 1; index >= 0; index--) {
				const hit = response.data.data.hits[index];

				if (hit.from !== details.to || hit.to !== details.from) continue;

				transaction.swapAmount = hit.valueRaw;
				transaction.swapSymbol = hit.symbol;
				transaction.swapLogo = hit.logoUrl;
				transaction.swapContractAddress = hit.tokenContractAddress;

				break;
			}
		}

		return transaction;
	} catch (error) {
		console.error({ error });
	}

	return transaction;
};

module.exports = {
	getAddress,
	getGasTracker,
	getTransactionsList,
	getTransactionStatus,
	getTransactionStatusV2,
};
