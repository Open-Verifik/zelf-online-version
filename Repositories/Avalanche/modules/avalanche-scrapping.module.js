const axios = require("axios");
const moment = require("moment");
const { generateRandomUserAgent } = require("../../../Core/helpers");
const { get_ApiKey } = require("../../Solana/modules/oklink");
const cheerio = require("cheerio");
// Crear instancia axios con timeout
const instance = axios.create({ timeout: 30000 });

// Crear instancia https que ignora certificados SSL inválidos
const https = require("https");

const agent = new https.Agent({ rejectUnauthorized: false });

/**
 * Obtiene el balance de una dirección en Avalanche
 * @param {Object} params - Contiene el id (dirección)
 */
const getBalance = async (params) => {
	try {
		// Obtener balance nativo
		const { data } = await instance.get(`https://glacier-api.avax.network/v1/chains/43114/addresses/${params.id}/balances:getNative`, {
			headers: { "user-agent": generateRandomUserAgent() },
		});

		// Obtener tokens y transacciones
		const tokenHoldings = await getTokens({ id: params.id }, { show: "200" });

		const transactions = await getTransactionsList({
			id: params.id,
			page: "0",
			show: "100",
		});

		return {
			address: params.id,
			image: data.nativeTokenBalance.logoUri,
			balance: (Number(data.nativeTokenBalance.balance) / 10 ** data.nativeTokenBalance.decimals).toFixed(data.nativeTokenBalance.decimals),
			_balance: parseFloat(
				(Number(data.nativeTokenBalance.balance) / 10 ** data.nativeTokenBalance.decimals).toFixed(data.nativeTokenBalance.decimals)
			),
			fiatBalance: data.nativeTokenBalance?.balanceValue?.value || 0,
			decimals: data.nativeTokenBalance.decimals,
			account: {
				asset: "AVAX",
				fiatBalance: data.nativeTokenBalance?.balanceValue?.value.toString(),
				price: data.nativeTokenBalance?.price?.value.toString(),
			},
			tokenHoldings,
			transactions,
		};
	} catch (error) {
		console.error({ error });
	}
};

/**
 * Obtiene los tokens ERC20 de una dirección
 * @param {Object} params - Contiene el id (dirección)
 * @param {Object} query - Parámetros adicionales
 */
const getTokens = async (params, query) => {
	// Obtener tokens ERC20
	const { data } = await instance.get(
		`https://glacier-api.avax.network/v1/chains/43114/addresses/${params.id}/balances:listErc20?pageSize=100&filterSpamTokens=true`,
		{ headers: { "user-agent": generateRandomUserAgent() } }
	);

	// Obtener conteo total de tokens
	const total = await instance.get(`https://cdn.routescan.io/api/blockchain/all/address/${params.id}?ecosystem=avalanche`, {
		headers: { "user-agent": generateRandomUserAgent() },
	});

	const erc20Count = total.data.erc20Count;
	const erc721Count = total.data.erc721Count;
	const erc1155Count = total.data.erc1155Count;

	// Formatear datos de tokens
	const formattedTokens = data.erc20TokenBalances.map((token) => ({
		tokenType: token.ercType,
		fiatBalance: token.balanceValue?.value || 0,
		_fiatBalance: token.balanceValue?.value.toString(),
		symbol: token.symbol,
		name: token.name,
		price: token.price?.value?.toString() || "0",
		_price: token.price?.value,
		image: token.logoUri,
		decimals: token.decimals,
		amount: (Number(token.balance) / 10 ** token.decimals).toFixed(12),
		_amount: parseFloat((Number(token.balance) / 10 ** token.decimals).toFixed(12)),
		address: token.address,
	}));

	// Calcular balance total en moneda fiat
	const totalFiatBalance = formattedTokens.reduce((sum, token) => sum + parseFloat(token.fiatBalance), 0);

	return {
		balance: totalFiatBalance.toString(),
		total: erc20Count + erc721Count + erc1155Count,
		tokens: formattedTokens,
	};
};

/**
 * Obtiene las transacciones de una dirección
 * @param {Object} params - Contiene el id (dirección)
 * @param {Object} query - Parámetros de paginación
 */
const getTransactionsList = async (params) => {
	const t = Date.now();

	const { id, page, show } = params;

	const url = `https://www.oklink.com/api/explorer/v2/avaxc/addresses/${id}/transactionsByClassfy/condition?offset=${page || "0"}&limit=${
		show || "100"
	}&address=${id}&nonzeroValue=false&t=${t}`;

	const { data } = await axios.get(url, {
		httpsAgent: agent,
		headers: {
			"X-Apikey": get_ApiKey().getApiKey(),
			"User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/132.0.0.0 Safari/537.36",
		},
	});

	// Formatear transacciones
	const transactions = data.data.hits.map((tx) => ({
		hash: tx.hash,
		method: tx.method.startsWith("swap") ? "Swap" : tx.method,
		block: tx.blockHeight.toString(),
		age: moment(tx.blocktime * 1000).fromNow(),
		date: moment(tx.blocktime * 1000),
		from: tx.from,
		traffic: tx.realValue < 0 ? "OUT" : "IN",
		to: tx.to,
		amount: tx.value.toFixed(4),
		asset: "AVAX",
		txnFee: tx.fee.toFixed(4),
	}));

	return transactions;
};

/**
 * Obtiene detalles de una transacción específica
 * @param {Object} params - Contiene el id (hash de la transacción)
 */
const getTransactionDetail = async (params) => {
	try {
		const id = params.id;

		const baseUrl = "https://snowscan.xyz";

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
					network: "avalanche",
					token: tokenName,
					icon: icon ? `https://snowscan.xyz${icon}` : null,
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

		const valueNetwork = $("#ContentPlaceHolder1_spanValue > div > ")
			.text()
			.replace("AVAX", "")
			.split("$")[0]
			.trim()
			.replace("(", "")
			.replace(")", "")
			.trim();

		const valueDolar =
			$("#ContentPlaceHolder1_spanValue > div > span.text-muted").text().trim().replace("($", "").replace(")", "") ||
			$("#ContentPlaceHolder1_spanValue > div > ").text().replace("AVAX", "").split("$")[1].trim();

		const transactionFee = $("#ContentPlaceHolder1_spanTxFee > div > span:nth-child(1)").text().replace("AVAX", "").trim();

		const transactionFeeFiat = $("#data-tfprice").text().replace("$", "").replace(")", "").replace("(", "").trim();

		const gasPriceGwei = $("#ContentPlaceHolder1_spanGasPrice").text().split("Gwei");

		const gasPrice = gasPriceGwei[0].trim();
		const gwei = gasPriceGwei[1].replace("(", "").replace(")", "").replace("AVAX", "").trim();

		const observation = $("#ContentPlaceHolder1_spanValue > div > span:nth-child(4) > span").text().replace("[", "").replace("]", "").trim();

		const response = {
			transactionType,
			hash: id,
			id,
			status,
			block,
			timestamp,
			network: "avalanche",
			symbol: "AVAX",
			image: "https://snowscan.xyz/assets/avax/images/svg/logos/chain-dim.svg",
			age: timestamp2,
			date: moment(date, "MMM-DD-YYYY HH:mm:ss").format("YYYY-MM-DD HH:mm:ss"),
			from,
			to,
			amount: Number(valueNetwork),
			// valueDolar: Number(valueDolar),
			fiatAmount: Number(valueDolar),
			transactionFee,
			transactionFeeFiat,
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
		const error = new Error("transaction_not_found");

		error.status = 404;

		throw error;
	}
};

module.exports = {
	getBalance,
	getTransactionsList,
	getTransactionDetail,
	getTokens,
};
