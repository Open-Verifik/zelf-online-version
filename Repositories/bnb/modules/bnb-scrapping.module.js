const { getCleanInstance } = require("../../../Core/axios");
const instance = getCleanInstance(30000);
const cheerio = require("cheerio");
const { getTickerPrice } = require("../../binance/modules/binance.module");
const baseUrl = "https://bscscan.com";
const moment = require("moment");

/**
 * @param {*} params
 */
//
const getBalance = async (params) => {
	try {
		const address = params.id;
		const { data } = await instance.get(
			`https://bsc-explorer-api.nodereal.io/api/token/getBalance?address=${address}`
		);
		const { price } = await getTickerPrice({ symbol: "BNB" });
		const { transactions } = await getTransactionsList(
			{ id: address },
			{ show: "10" }
		);

		function sumarPrice(tokens) {
			return tokens.reduce(
				(acumulador, token) => acumulador + parseFloat(token.price),
				0
			);
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
// const parseTokenBalance = (tokenBalanceHex, tokenDecimalsHex) => {
// 	// Convertir de hexadecimal a decimal
// 	const balanceBigInt = BigInt(tokenBalanceHex);
// 	const decimals = parseInt(tokenDecimalsHex, 16);

// 	// Dividir balance por 10^decimals
// 	const divisor = BigInt(10) ** BigInt(decimals);
// 	const balance = Number(balanceBigInt) / Number(divisor);

// 	return balance;
// };

// // Ejemplo de uso
// const tokenBalance =
// 	"0x000000000000000000000000000000000000000000000000000e56746cbd7f1a";
// const tokenDecimals = "0x12"; // 18 en decimal

// const readableBalance = parseTokenBalance(tokenBalance, tokenDecimals);

// console.log(readableBalance);
// const getBalance = async (params) => {
// 	try {
// 		const address = params.address;

// 		const { data } = await instance.get(`${baseUrl}/address/${params.id}`, {
// 			headers: {
// 				"user-agent":
// 					"Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/135.0.0.0 Safari/537.36",
// 				cookie:
// 					"_ga=GA1.1.1181578226.1745360069; bscscan_offset_datetime=-5; bscscan_switch_token_amount_value=value; bitmedia_fid=eyJmaWQiOiIxMWUxMjRhMWQ5ODVhYWVlMmEzYmNhNGZiNDIxNTM1YyIsImZpZG5vdWEiOiJiZjZkMGJjNzI0NzU0N2E5MmU1NTRkYmFhYWNhYTM2NiJ9; displaymode=dim; hidezeroprice=false; showethprice=false; ASP.NET_SessionId=ziwbzecvw5pkjc4k4d1xtvd0; __cflb=02DiuJNoxEYARvg2sN6bbkRgdyaaxAA7EwzRoJ2PGktfN; cf_clearance=h1Aj781dXbE5kCootymrDxbpI6bu0bO0OR75sIbYK.A-1745755357-1.2.1.1-W9PcJtpTjv31DfUuQfAQhhogHsT79tvtNljN6QSPFh9vbjNlj5Iibt12T7ThEgMhL81bdH4GCJ.BFK30FRwZkR6G0zCZIitlVfA6dmDkS6DSJZsxHeyOUa_esimkax7R2RPBL4GPFHqKteNeX4iwiWhjj52gRGj_dQtlc8NrtRVCcF6ffGdASxFogHtAGQj4NFGRZIkBnRF2ZFmoz0isO9_2uvi09kUOKKj6NcAXbw_mUzcnx7UXx1znQFP2pwOhs31PEjJUuJoHYEWxoLu71m0j.Ruh6SHvqxPyFS2ANHPWCj7Rr.3cLyXvwN.GccuLfYDfv.9rwbtc70z4CfW8ZUT30Mge5rIpeKcTGDVuSekHv3w3uPUh2MZ.v0nmeftf; _ga_PQY6J2Q8EP=GS1.1.1745755342.12.1.1745755449.0.0.0",
// 			},
// 		});

// 		const $ = cheerio.load(data);

// 		const fullName = $("#ensName > span > a > div > span")
// 			.text()
// 			.replace(/\n/g, "");

// 		const balance = $(
// 			"#ContentPlaceHolder1_divSummary > div.row.g-3.mb-4 > div:nth-child(1) > div > div > div:nth-child(2) > div"
// 		)
// 			.text()
// 			.replace(/\n/g, "")
// 			.replace(" POL", "")
// 			.trim();

// 		const accounts = $(
// 			"#ContentPlaceHolder1_divSummary > div.row.g-3.mb-4 > div:nth-child(1) > div > div > div:nth-child(3)"
// 		)
// 			.text()
// 			.replace(/\n/g, "")
// 			.split("@");

// 		let account;

// 		try {
// 			account = {
// 				asset: "POL",
// 				fiatBalance: accounts[0]
// 					.replace("Less Than", "")
// 					.replace("POL Value", "")
// 					.replace("(", "")
// 					.replace(",", "")
// 					.replace("$", "")
// 					.trim(),
// 				price: (await getTickerPrice({ symbol: `POL` })).price,
// 			};
// 		} catch (error) {
// 			//si no tiene nada
// 			account = {
// 				asset: "POL",
// 				fiatBalance: "0.00",
// 				price: (await getTickerPrice({ symbol: `POL` })).price,
// 			};
// 		}

// 		const totalTokens = $("#dropdownMenuBalance")
// 			.text()
// 			.trim()
// 			.replace(/\n/g, "")
// 			.split("(")[0];

// 		const balanceTokens = $("#dropdownMenuBalance")
// 			.text()
// 			.trim()
// 			.replace(/\n/g, "")
// 			.split("(")[1];

// 		let tokensContracts;

// 		try {
// 			tokensContracts = {
// 				balance: totalTokens.replace("$", "").replace(">", "").trim(),
// 				total: balanceTokens.replace(">", "").replace("Tokens)", "").trim(),
// 			};
// 		} catch (error) {
// 			console.log(error);
// 			tokensContracts = {
// 				balance: "0.00",
// 				total: 0,
// 			};
// 		}

// 		const tokens = [];

// 		let currentTokenType = "";

// 		$("ul.list li.nav-item").each((index, element) => {
// 			const tokenTypeElement = $(element).find(".fw-medium").text().trim();

// 			if (tokenTypeElement) {
// 				currentTokenType = tokenTypeElement
// 					.replace("Tokens", "")
// 					.split("(")[0]
// 					.trim();
// 				return;
// 			}

// 			const tokenName =
// 				$(element).find(".list-name span").attr("data-bs-title") ||
// 				$(element).find(".list-name").text().trim();
// 			const tokenAmount = $(element).find(".text-muted").text().trim();

// 			const [_amount, rest] = tokenAmount.split(" ");

// 			// Then, split the second part on '@' to isolate the price
// 			const [, _price] = tokenAmount.split("@");

// 			const tokenType = $(element).find(".badge").text().trim();
// 			const tokenLink = $(element)
// 				.find("a.nav-link")
// 				.attr("href")
// 				.replace("/token/", "");
// 			const tokenImage = $(element).find("img").attr("src");

// 			let name = null;
// 			let symbol = null;

// 			try {
// 				name = tokenName.split("(")[0].trim();
// 				symbol = tokenName.split("(")[1].replace(")", "").trim();
// 			} catch (error) {}

// 			if (name && tokenImage) {
// 				const token = {
// 					tokenType: currentTokenType,
// 					fiatBalance: (_price * _amount).toFixed(10),
// 					name: cleanString(name),
// 					symbol: cleanString(symbol),
// 					amount: _amount.replace(/,/g, ""),
// 					price: _price,
// 					type: tokenType,
// 					address: tokenLink.split("?")[0],
// 					image: tokenImage?.startsWith("https")
// 						? tokenImage
// 						: `https://etherscan.io${tokenImage}` ||
// 						  `https://nwgz3prwfm5e3gvqyostyhk4avy3ygozgvqlvzd2txqjmwctdzxq.arweave.zelf.world/bY2dvjYrOk2asMOlPB1cBXG8Gdk1YLrkep3gllhTHm8`,
// 				};

// 				tokens.push(token);
// 			}
// 		});

// 		const tokenHoldings = {
// 			...tokensContracts,
// 			tokens,
// 		};

// 		const transactions = [];

// 		try {
// 			const tabla = $("#transactions > div > div.table-responsive").html();
// 			const campos = cheerio.load(tabla);

// 			campos("tbody tr").each((_index, element) =>
// 				_parseTransactionsContent(campos, element, transactions)
// 			);
// 		} catch (error) {
// 			console.error({ error });
// 		}

// 		tokenHoldings.tokens.unshift({
// 			tokenType: "POL",
// 			fiatBalance: Number(account.fiatBalance),
// 			symbol: "POL",
// 			name: "polygon",
// 			price: account.price,
// 			image:
// 				"https://nwgz3prwfm5e3gvqyostyhk4avy3ygozgvqlvzd2txqjmwctdzxq.arweave.zelf.world/bY2dvjYrOk2asMOlPB1cBXG8Gdk1YLrkep3gllhTHm8",
// 			amount: balance,
// 		});

// 		const response = {
// 			address,
// 			fullName,
// 			balance,
// 			fiatBalance: Number(account.fiatBalance),
// 			account,
// 			tokenHoldings,
// 			transactions,
// 		};

// 		return response;
// 	} catch (error) {
// 		console.error({ error });
// 	}
// };

const getTokens = async (params) => {
	try {
		const address = params.id;
		const { data } = await instance.get(
			`https://bsc-explorer-api.nodereal.io/api/token/getTokensByAddress?address=${address}&pageSize=0x64`
		);

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
			tokenType: "BEP-20",
			fiatBalance: parseFloat(fiatBalance.toFixed(7)),
			_fiatBalance: fiatBalance.toFixed(7),
			symbol:
				token.tokenSymbol.length <= 10
					? token.tokenSymbol
					: token.tokenSymbol.substring(0, 10), // Limitamos símbolo si es muy largo
			name: token.tokenName,
			price: price.toFixed(6),
			_price: price,
			image: "", // Puedes después añadir un fetch a CoinMarketCap o una API para obtener imágenes
			decimals: decimals,
			amount: amount.toFixed(12),
			_amount: amount,
			address: token.tokenAddress,
		};
	});
}

const getGasTracker = async () => {
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

		const lowTime = $("#divLowPrice > div.text-muted")
			.first()
			.text()
			.replace(/\n/g, "")
			.trim()
			.trim();

		const averageTime = $("#divAvgPrice > div.text-muted")
			.text()
			.replace(/\n/g, "")
			.trim()
			.trim();

		const highTime = $("#divHighPrice > div.text-muted")
			.text()
			.replace(/\n/g, "")
			.trim()
			.trim();

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
				"user-agent":
					"Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/127.0.0.0 Safari/537.36",
				"Upgrade-Insecure-Requests": "1",
			},
		});

		const $ = cheerio.load(data);

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

		const valueBSC = $(
			"#ContentPlaceHolder1_spanValue > div > span:nth-child(2)"
		)
			.text()
			.replace("BSC", "")
			.trim();

		const valueDolar = $(
			"#ContentPlaceHolder1_spanValue > div > span.text-muted"
		)
			.text()
			.replace("($", "")
			.replace(")", "")
			.trim();

		const transactionFeeBSC = $(
			"#ContentPlaceHolder1_spanTxFee > div > span:nth-child(1)"
		)
			.text()
			.replace("BSC", "")
			.trim();

		const transactionFeeDolar = $(
			"#ContentPlaceHolder1_spanTxFee > div > span.text-muted"
		)
			.text()
			.replace("($", "")
			.replace(")", "")
			.trim();

		const observation = $(
			"#ContentPlaceHolder1_spanValue > div > span:nth-child(4) > span"
		)
			.text()
			.replace("[", "")
			.replace("]", "")
			.trim();

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
			valueBSC,
			valueDolar,
			transactionFeeBSC,
			transactionFeeDolar,
			observation,
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
					mBSCod: tx.MBSCod,
					block: tx.Blockno,
					age: moment(tx.DateTime).fromNow(),
					date: tx.DateTime,
					from: tx.Sender,
					to: tx.Receiver,
					traffic: determineTraffic(address, tx.Sender, tx.Receiver),
					fiatAmount: tx.Value.replace("$", ""),
					amount: tx.Amount.split(" ")[0].replace(",", ""),
					asset: "BSC",
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
	transaction.mBSCod = campos(element)
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
