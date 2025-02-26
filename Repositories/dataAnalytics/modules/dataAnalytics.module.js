const { getCleanInstance } = require("../../../Core/axios");
const instance = getCleanInstance(30000);
const descriptions = require("../description.json");
/**
 * @param {*} params
 */

const get_data_analytics = async (params) => {
	try {
		const crypto = await instance.get(
			"https://s3.coinmarketcap.com/generated/core/crypto/app-search.json",
			{
				headers: {
					"user-agent": "Dart/3.2 (dart:io)",
					appversion: "4.63.1",
					platform: "android",
				},
			}
		);

		function searchCryptoID(simbolo) {
			const resultado = crypto.data.values.find((item) => item[2] === simbolo);
			return resultado ? resultado[0] : `No se encontró el símbolo ${simbolo}`;
		}

		const iDCrypto = searchCryptoID(params.network);

		const statistics = await instance.get(
			`https://api.coinmarketcap.com/aggr/v3.1/mobile/coin-detail?id=${iDCrypto}&langCode=en&convertId=${iDCrypto}`,
			{
				headers: {
					"user-agent": "Dart/3.2 (dart:io)",
					appversion: "4.63.1",
					platform: "android",
				},
			}
		);
		//console.log(statistics.data.data.description);
		function getCryptoName(symbol) {
			switch (symbol.toUpperCase()) {
				case "BTC":
					return "bitcoin";
				case "ETH":
					return "ethereum";
				case "SOL":
					return "solana";
				case "ADA":
					return "cardano";
				case "XRP":
					return "ripple";
				case "DOGE":
					return "dogecoin";
				case "IP":
					return "ip";
				case "DOT":
					return "polkadot";
				case "MATIC":
					return "polygon";
				case "LTC":
					return "litecoin";
				case "BCH":
					return "bitcoin cash";
				case "BNB":
					return "binance-coin";
				case "XLM":
					return "stellar";
				case "TRX":
					return "tron";
				case "AVAX":
					return "avalanche";
				case "LINK":
					return "chainlink";
				case "ATOM":
					return "cosmos";
				case "ALGO":
					return "algorand";
				case "VET":
					return "vechain";
				case "FIL":
					return "filecoin";
				case "ICP":
					return "internet-computer";
				case "HBAR":
					return "hedera";
				case "QNT":
					return "quant";
				case "FTM":
					return "fantom";
				case "NEAR":
					return "near-protocol";
				case "GRT":
					return "the graph";
				case "EGLD":
					return "elrond";
				case "SAND":
					return "the sandbox";
				case "AXS":
					return "axie infinity";
				case "AAVE":
					return "aave";
				case "MKR":
					return "maker";
				case "ZEC":
					return "zcash";
				case "XMR":
					return "monero";
				case "IOTA":
					return "iota";
				case "KSM":
					return "kusama";
				case "XTZ":
					return "tezos";
				case "THETA":
					return "theta";
				case "ENJ":
					return "enjin-coin";
				case "RVN":
					return "ravencoin";
				case "CHZ":
					return "chiliz";
				case "FLOW":
					return "flow";
				case "ONE":
					return "harmony";
				case "BAT":
					return "basic-attention-token";
				case "STX":
					return "stacks";
				case "ZIL":
					return "zilliqa";
				case "ONT":
					return "ontology";
				case "WAVES":
					return "waves";
				case "AR":
					return "arweave";
				case "CELO":
					return "celo";
				case "GALA":
					return "gala";
				case "DASH":
					return "dash";
				case "COMP":
					return "compound";
				case "CRV":
					return "curve-dao-token";
				case "SNX":
					return "synthetix";
				case "YFI":
					return "yearn.finance";
				case "UMA":
					return "uma";
				case "DGB":
					return "digibyte";
				case "ICX":
					return "icon";
				case "OMG":
					return "omg network";
				case "BTT":
					return "bittorrent";
				case "SC":
					return "siacoin";
				case "ANKR":
					return "ankr";
				case "STORJ":
					return "storj";
				case "OCEAN":
					return "ocean-protocol";
				case "LRC":
					return "loopring";
				case "KNC":
					return "kyber network";
				case "SRM":
					return "serum";
				case "REN":
					return "ren";
				case "TRUMP":
					return "official-trump";
				case "REEF":
					return "reef-finance";
				case "BAND":
					return "band-protocol";
				case "FTT":
					return "ftx-token";
				case "RUNE":
					return "thorchain";
				case "CVC":
					return "civic";
				case "BAL":
					return "balancer";
				case "SUSHI":
					return "sushiswap";
				case "PAXG":
					return "pax-gold";
				case "RSR":
					return "reserve rights";
				case "AUDIO":
					return "audius";
				case "JST":
					return "just";
				case "HNT":
					return "helium";
				case "TWT":
					return "trust-wallet-token";
				case "DODO":
					return "dodo";
				case "KP3R":
					return "keep3r";

				default:
					return "Criptomoneda no reconocida";
			}
		}
		const cryptoName = getCryptoName(params.network);

		const { data } = await instance.get(
			`https://www.coinbase.com/graphql/query?&operationName=useGetPriceChartDataQuery&extensions={"persistedQuery":{"version":1,"sha256Hash":"2f667e92bca631b26ec8179b1e484b24553daaaf690b94ef251fa4aed988ea34"}}&variables={"skip":false,"slug":"${cryptoName}","currency":"${params.symbol}"}`,
			{
				headers: {
					"user-agent":
						"Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/132.0.0.0 Safari/537.36",
					"cb-client": "CoinbaseWeb",
					"cb-version": "2021-01-11",
					"content-type": "application/json",
					cookie: `cb_dm=12e365e5-fb26-4ec9-aeac-71ff8bb0e4cf; coinbase_currency=${params.symbol}; coinbase_locale=en; cb_logged_out_locale=en; coinbase_device_id=857c5e72-fcf9-4e40-aff1-699ed48196b4; __cf_bm=rtfhabYAwxrw.sjB9YZrLcfu_NJYPgIiPRyd5d2N2nk-1739282858-1.0.1.1-A79lSMkIx5EgZzXogqUHgVp5ORoxIhc95D8HwAp.MjkoRKHKR13ES5wWyVR6d7C_0GjOncViZjnYH3_Yrm__rg; advertising_sharing_allowed={%22value%22:true}; _gid=GA1.2.1580179070.1739282861; _fbp=fb.1.1739282860729.327809177951669253; _ga=GA1.2.1580003030.1739282861; _ga_W5Z1BRK56L=GS1.2.1739282861.1.1.1739282891.0.0.0; rlm_dismissed_asset=%221%22; _ga_90YJL6R0KZ=GS1.1.1739282860.1.1.1739283089.60.0.0; __cf_bm=.qAiYWZ1MEsqGZXrVAiKi8aB2wWJhmV5f6lZkIFUB98-1739388946-1.0.1.1-PsG8YpRK8PqQhuuC4.K0G59GAnLRbs8OpZHy8XWEbiVYAgWyidpLV2KPbRlANq5llgd6s_FLE5JLrU3tZ85nvg; cb_dm=e5662468-2048-4a96-9c8a-36ff22306ed1; coinbase_device_id=885021ff-f9d2-4322-bdbe-c1f6818f2566; cb_dm=e5a597de-fedd-414c-88dd-b591565941aa`,
					priority: "u=1, i",
					redirect: "follow",
					referer: "https://www.coinbase.com/price/solana",
				},
			}
		);

		function getCryptoBySymbol(symbol) {
			return (
				descriptions.cryptos.find(
					(crypto) => crypto.symbol.toUpperCase() === symbol.toUpperCase()
				) || { error: "Crypto not found" }
			);
		}
		delete statistics.data.data.urls.message_board;
		delete statistics.data.data.urls.explorer;
		delete statistics.data.data.urls.announcement;
		delete data.data.assetBySlug.id;
		delete data.data.assetBySlug.latestPrice.id;

		return {
			description: statistics.data.data.description, //getCryptoBySymbol(params.network),
			statistics: statistics.data.data.statistics,
			urls: statistics.data.data.urls,
			assetBySlug: data.data.assetBySlug,
		};
	} catch (error) {
		console.log(error);
		return {};
	}
};

module.exports = {
	get_data_analytics,
};
