const cheerio = require("cheerio");
const moment = require("moment");
require("dotenv").config();
const urlBase = process.env.MICROSERVICES_BOGOTA_URL;
const token = process.env.MICROSERVICES_BOGOTA_TOKEN;
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

		function formatTokens(entrada) {
			return entrada.reduce((acc, item) => {
				const price = item.token?.exchange_rate || 0;

				// Skip tokens with zero price to filter out spam tokens
				if (price === 0 || price === null || price === undefined) return acc;

				const token = item.token;
				const decimals = parseInt(token.decimals);
				const rawAmount = item.value;

				const amount = Number(rawAmount) / Math.pow(10, decimals);

				const formattedToken = {
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

				acc.push(formattedToken);
				return acc;
			}, []);
		}

		const tokens = formatTokens(tokensResponse.data.items);

		const transactions = await getTransactionsList({ id: address }, { show: 10 });

		// Convert native MATIC balance from wei to proper decimal format (18 decimals)
		const maticDecimals = 18;
		const maticAmount = Number(data.coin_balance) / Math.pow(10, maticDecimals);
		const maticFiatBalance = maticAmount * price;

		const response = {
			address,
			balance: maticAmount.toFixed(maticDecimals),
			fiatBalance: maticFiatBalance,
			type: "system_account",
			account: {
				asset: "POL",
				fiatBalance: maticFiatBalance,
				price: price,
			},
			tokenHoldings: {
				total: 1 + tokens.length,
				balance: maticAmount.toFixed(maticDecimals),
				tokens: [
					{
						tokenType: "MATIC", // Changed from ERC-20 to MATIC for native token
						fiatBalance: maticFiatBalance,
						symbol: "POL",
						name: "Polygon",
						price: price,
						image: "https://s2.coinmarketcap.com/static/img/coins/64x64/28321.png",
						amount: maticAmount.toFixed(maticDecimals),
						decimals: maticDecimals,
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

		const { data } = await instance.get(`${urlBase}/api/evm-tx/polygon-transaction?address=${id}`, {
			headers: {
				Authorization: `Bearer ${token}`,
			},
		});

		return data;
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
		const { data } = await instance.get(`${urlBase}/api/evm-tx/polygon-transactions?address=${address}&show=${show}`, {
			headers: {
				Authorization: `Bearer ${token}`,
			},
		});

		return { pagination: { records: "0", pages: "0", page: "0" }, transactions: data };
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
