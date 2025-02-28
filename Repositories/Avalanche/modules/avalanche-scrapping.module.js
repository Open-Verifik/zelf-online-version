const { getCleanInstance } = require("../../../Core/axios");
const cheerio = require("cheerio");
const instance = getCleanInstance(30000);
const { generateRandomUserAgent } = require("../../../Core/helpers");
const { getTickerPrice } = require("../../binance/modules/binance.module");
const formatterClass = require("../../class/data-formatterClass");
const formatterNumberClass = require("../../class/data-formatterNumberClass");

/**
 * @param {*} params
 */

const getBalance = async (params) => {
	try {
		const { data } = await instance.get(
			`https://cdn.routescan.io/api/blockchain/all/address/${params.id}?ecosystem=avalanche`,

			//`https://cdn.routescan.io/api/search?query=${params.id}&limit=10&chainId=all&ecosystem=avalanche&filter=erc20&filter=erc721&filter=addresses`,
			{
				headers: {
					"user-agent": generateRandomUserAgent(),
				},
			}
		);

		const { price } = await getTickerPrice({ symbol: "AVAX" });

		const { transactions } = await getTokens({ id: params.id });

		return {
			address: params.id,
			fullName: "not_available",
			balance: data.balance.value,
			fiatBalance: data.instances[1].data.evmBalance.usdValue,
			//currency: "USD",
			account: {
				asset: "AVAX",
				fiatBalance: data.instances[1].data.evmBalance.usdValue,
				price: price,
			},
			tokenHoldings: {
				total: 0,
				balance: 0,
				tokens: [],
			},
			transactions: "", // formatTransactionData(transactions),
		};
	} catch (error) {
		console.error({ error });
	}
};

function formatTransactionData(transactions) {
	return transactions.map((tx) => {
		return {
			blockHeight: tx.block.height,
			blockPosition: tx.block.position,
			hash: tx.txid,
		};
	});
}

const getTokens = async (params, query) => {
	const { data } = await instance.get(
		`https://snowtrace.io/tokenholdings/${params.id}/gas-holdings`,
		{
			headers: {
				"user-agent": generateRandomUserAgent(),
				cookie:
					"_ga=GA1.1.2070545318.1740515498; aws-waf-token=35b17461-777e-4a61-83eb-e07a5152d1ca:EAoAqSZ7PeNWAwAA:QJ0crtXGHgDHIxW92EtgWCeVp88gdKIGJddkptlnwddkwWrNtVo1lWBRvfhO551uMgeZeKy9D9yubGjFV0n+sWVI5nZeMNAzLWn/Q/2jE7UWMILFIOdP4Y38skjHBAVkGtPP8su9r6TjPMF52GSv4eUuzL2LZT94cvsSCzbGIXvkKoyXog3yRojpC32g2KY=; __Host-next-auth.csrf-token=fe7df0f6ba5dcd271c7def2a9b4b3508132ad1ca2faece82342b5601f8b9f577%7Cccb0f8f6097e60904a51b6dcc07f2d72be7ea5c1a1cbfa6dbbf90a188ef6622f; __Secure-next-auth.callback-url=https%3A%2F%2Froutescan.io; _ga_6E3C7SMVPH=GS1.1.1740764663.8.1.1740764861.0.0.0; darkmode=1",
				priority: "u=0, i",
			},
		}
	);

	const $ = cheerio.load(data);
	console.log(
		$(
			"#tokenholdings > div.bg-v2-bg-light.dark\\:bg-v2-bg-dark-2 > div > div > div.tbody > div:nth-child(1) > div > div.td.flex.items-center.w-\\[215px\\].md\\:w-\\[25\\%\\] > span"
		).text()
	);

	return { transactions: data };
};
/**
 * get transactions list
 * @param {Object} params
 * @returns
 */
const getTransactionsList = async (params, query) => {
	const { data } = await instance.get(
		`https://api.blockchain.info/haskoin-store/btc/address/${params.id}/transactions?limit=${query.show}&offset=0`,
		{
			headers: {
				"user-agent": generateRandomUserAgent(),
			},
		}
	);
	return { transactions: data };
};

/**
 * get transaction status
 * @param {Object} params
 */
const getTransactionDetail = async (params, query) => {
	const { data } = await instance.get(
		`https://api.blockchain.info/haskoin-store/btc/transaction/${params.id}`,
		{
			headers: {
				"user-agent": generateRandomUserAgent(),
			},
		}
	);

	return { transactionDetail: data };
};
const formatData = (data) => {
	const forma = new formatterClass(data);

	const translated = forma.translateKeys();

	return translated;
};
const formatNumber = (data) => {
	const formattedData = formatterNumberClass.formatData(data);

	return formattedData;
};

module.exports = {
	getBalance,
	getTransactionsList,
	getTransactionDetail,
};
