const cheerio = require("cheerio");
require("dotenv").config();
const urlBase = process.env.MICROSERVICES_BOGOTA_URL;
const token = process.env.MICROSERVICES_BOGOTA_TOKEN;
const { getCleanInstance } = require("../../../Core/axios");
const { getTickerPrice } = require("../../binance/modules/binance.module");

const baseUrl = "https://bscscan.com";
const instance = getCleanInstance(30000);
const bscscanApiKey = process.env.BSCSCAN_API_KEY;
const bscscanApiUrl = process.env.BSCSCAN_API_URL || "https://api.bscscan.com/api";

// Curated list of common/legit BNB Chain tokens (lowercased BEP-20 contracts)
const COMMON_TOKENS_BSC = new Set([
	// Stablecoins & majors
	"0x55d398326f99059ff775485246999027b3197955", // USDT
	"0x8ac76a51cc950d9822d68b83fe1ad97b32cd580d", // USDC
	"0xe9e7cea3dedca5984780bafc599bd69add087d56", // BUSD (legacy but common)
	"0x1af3f329e8be154074d8769d1ffa4ee058b1dbc3", // DAI
	// Wrapped and pegged assets
	"0xbb4cdb9cbd36b01bd1cbaebf2de08d9173bc095c", // WBNB
	"0x7130d2a12b9bcbfae4f2634d864a1ee1ce3ead9c", // BTCB
	"0x2170ed0880ac9a755fd29b2688956bd959f933f8", // ETH (Binance-Peg)
	// Popular ecosystem tokens
	"0x0e09fabb73bd3ade0a17ecc321fd13a19e81ce82", // CAKE
	"0x5ca42204cdaa70d5c773946e69de942b85ca6706", // POSI
	"0xbA2aE424d960c26247Dd6c32edC70B295c744C43".toLowerCase(), // DOGE (BEP-20)
]);

// Mapping of common token contract -> CoinGecko ID (for fallback pricing by ID)
const COMMON_TOKEN_ID_BY_ADDRESS = new Map([
	["0x0e09fabb73bd3ade0a17ecc321fd13a19e81ce82", "pancakeswap-token"], // CAKE
	["0x55d398326f99059ff775485246999027b3197955", "tether"], // USDT
	["0x8ac76a51cc950d9822d68b83fe1ad97b32cd580d", "usd-coin"], // USDC
	["0xe9e7cea3dedca5984780bafc599bd69add087d56", "binance-usd"], // BUSD
	["0x1af3f329e8be154074d8769d1ffa4ee058b1dbc3", "dai"], // DAI
	["0xbb4cdb9cbd36b01bd1cbaebf2de08d9173bc095c", "wbnb"], // WBNB
	["0x7130d2a12b9bcbfae4f2634d864a1ee1ce3ead9c", "binance-bitcoin"], // BTCB
	["0x2170ed0880ac9a755fd29b2688956bd959f933f8", "ethereum"], // ETH (Peg)
	["0x5ca42204cdaa70d5c773946e69de942b85ca6706", "position-token"], // POSI
	["0xba2ae424d960c26247dd6c32edc70b295c744c43", "dogecoin"], // DOGE (BEP-20)
]);

function isCommonToken(address) {
	return COMMON_TOKENS_BSC.has((address || "").toLowerCase());
}

/**
 * Fetch USD prices from CoinGecko for a list of BEP-20 contract addresses
 * Returns a Map<lowercasedContractAddress, usdPrice>
 */
async function getCoinGeckoPricesForContracts(contractAddresses) {
	try {
		if (!Array.isArray(contractAddresses) || contractAddresses.length === 0) {
			return new Map();
		}

		const uniqueAddresses = Array.from(new Set(contractAddresses.map((addr) => (addr || "").toLowerCase()))).filter(Boolean);

		const chunkSize = 100; // CoinGecko supports large batches; keep conservative
		const priceMap = new Map();

		for (let i = 0; i < uniqueAddresses.length; i += chunkSize) {
			const chunk = uniqueAddresses.slice(i, i + chunkSize);
			const url = `https://api.coingecko.com/api/v3/simple/token_price/binance-smart-chain?contract_addresses=${chunk.join(
				","
			)}&vs_currencies=usd`;
			const { data } = await instance.get(url);

			// data is an object keyed by lowercased contract address
			Object.entries(data || {}).forEach(([address, value]) => {
				const usd = value && typeof value.usd === "number" ? value.usd : 0;
				if (usd > 0) {
					priceMap.set(address.toLowerCase(), usd);
				}
			});
		}

		return priceMap;
	} catch (error) {
		// If CoinGecko fails (rate limits, network), return empty to avoid breaking the flow
		console.error({ coingecko_price_fetch_error: error?.message || error });
		return new Map();
	}
}

async function getCoinGeckoPricesForIds(ids) {
	try {
		if (!Array.isArray(ids) || ids.length === 0) return new Map();
		const unique = Array.from(new Set(ids.filter(Boolean)));
		const chunkSize = 100;
		const priceMap = new Map();
		for (let i = 0; i < unique.length; i += chunkSize) {
			const chunk = unique.slice(i, i + chunkSize);
			const url = `https://api.coingecko.com/api/v3/simple/price?ids=${chunk.join(",")}&vs_currencies=usd`;
			const { data } = await instance.get(url);
			Object.entries(data || {}).forEach(([id, value]) => {
				const usd = value && typeof value.usd === "number" ? value.usd : 0;
				if (usd > 0) priceMap.set(id, usd);
			});
		}
		return priceMap;
	} catch (error) {
		console.error({ coingecko_id_price_fetch_error: error?.message || error });
		return new Map();
	}
}

/**
 * Determine which contracts are verified on BscScan.
 * Returns a Set of lowercased addresses that are verified.
 * If no API key is configured, returns an empty Set (no filtering will rely solely on this).
 */
async function getBscVerifiedContracts(contractAddresses) {
	try {
		if (!bscscanApiKey) {
			// No API key → skip verification filtering
			return new Set();
		}

		const uniqueAddresses = Array.from(new Set((contractAddresses || []).map((addr) => (addr || "").toLowerCase()))).filter(Boolean);

		const concurrency = 5;
		const verified = new Set();

		for (let i = 0; i < uniqueAddresses.length; i += concurrency) {
			const batch = uniqueAddresses.slice(i, i + concurrency);

			const results = await Promise.all(
				batch.map(async (address) => {
					try {
						const url = `${bscscanApiUrl}?module=contract&action=getsourcecode&address=${address}&apikey=${bscscanApiKey}`;
						const { data } = await instance.get(url);
						const item = Array.isArray(data?.result) ? data.result[0] : undefined;
						const abi = item?.ABI;
						if (abi && typeof abi === "string" && abi !== "Contract source code not verified") {
							return address;
						}
					} catch (err) {
						// Ignore per-address errors to avoid failing the whole batch
					}
					return null;
				})
			);

			results.filter(Boolean).forEach((addr) => verified.add(addr));
		}

		return verified;
	} catch (error) {
		console.error({ bscscan_verification_error: error?.message || error });
		return new Set();
	}
}

// Basic name/symbol heuristic filter (no external API needed)
function isLikelyScamTokenName(name = "", symbol = "") {
	const n = String(name).toLowerCase();
	const s = String(symbol).toLowerCase();

	// Domain-like or promo-y keywords commonly seen in airdrop scam tokens
	const suspiciousPatterns = [".io", ".org", ".net", ".online", "swap", "dividend", "tracker", "airdrop", "promo", "get rich"];

	return suspiciousPatterns.some((p) => n.includes(p) || s.includes(p));
}

const getBalance = async (params) => {
	try {
		const address = params.id;
		const { data } = await instance.get(`https://bsc-explorer-api.nodereal.io/api/token/getBalance?address=${address}`);
		const { price } = await getTickerPrice({ symbol: "BNB" });
		const { transactions } = await getTransactionsList({ id: address }, { show: "10" });

		function sumarPrice(tokens) {
			return tokens.reduce((acumulador, token) => acumulador + parseFloat(token.price), 0);
		}

		let tokens = await getTokens({ id: address });

		const totalFiatBalance = sumarPrice(tokens);

		const rawValue = BigInt(data.data);
		const BSCValue = Number(rawValue) / 1e18;
		const fiatBalance = BSCValue * price;

		tokens.push({
			amount: BSCValue.toString(),
			fiatBalance: fiatBalance,
			image: "https://dynamic-assets.coinbase.com/36f266bc4826775268588346777c84c1ae035e7de268a6e124bcc22659f0aa2bf4f66dcad89b2ac978cfdb4d51c2d9f63cf7157769efb500b20ca16a6d5719c7/asset_icons/7deb6ff58870072405c0418d85501c4521c3296e33ef58452be98e4ca592ed19.png",
			name: "Binance",
			price: price,
			symbol: "BNB",
			tokenType: "BNB",
		});

		const response = {
			address,
			balance: BSCValue,
			fiatBalance,
			account: {
				asset: "BNB",
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

const getTokens = async (params) => {
	try {
		const address = params.id;

		const { data } = await instance.get(`https://bsc-explorer-api.nodereal.io/api/token/getTokensByAddress?address=${address}&pageSize=0x64`);

		const erc20Tokens = (data?.data?.erc20?.details || []).filter(Boolean);
		const contractAddresses = erc20Tokens.map((t) => t?.tokenAddress).filter(Boolean);

		// Replace Nodereal-provided prices with CoinGecko prices by contract
		const coingeckoPriceMap = await getCoinGeckoPricesForContracts(contractAddresses);

		// Query BscScan for source-code verification of contracts
		const bscVerifiedSet = await getBscVerifiedContracts(contractAddresses);

		// Fallback: fetch prices by CoinGecko ID for common tokens missing from contract-based map
		const missingCommonAddrs = contractAddresses.map((a) => (a || "").toLowerCase()).filter((a) => isCommonToken(a) && !coingeckoPriceMap.has(a));
		const idsToFetch = missingCommonAddrs.map((a) => COMMON_TOKEN_ID_BY_ADDRESS.get(a)).filter(Boolean);
		if (idsToFetch.length > 0) {
			const idPrices = await getCoinGeckoPricesForIds(idsToFetch);
			// Merge into contract price map
			missingCommonAddrs.forEach((addr) => {
				const id = COMMON_TOKEN_ID_BY_ADDRESS.get(addr);
				const usd = id ? idPrices.get(id) : 0;
				if (usd && usd > 0) coingeckoPriceMap.set(addr, usd);
			});
		}

		const formattedTokens = formatTokens(data.data, coingeckoPriceMap);

		// Hide tokens without a reliable price and those matching suspicious name patterns
		// Keep tokens that are either BscScan-verified OR present on CoinGecko (have price)
		const visibleTokens = formattedTokens
			// Always keep curated common tokens even if CoinGecko price is unavailable
			.filter((t) => isCommonToken(t.address) || Number(t._price) > 0)
			// Allow common tokens to bypass heuristic name filter
			.filter((t) => isCommonToken(t.address) || !isLikelyScamTokenName(t.name, t.symbol))
			.filter((t) => {
				const addr = (t.address || "").toLowerCase();
				const hasCgPrice = Number(t._price) > 0;
				const isVerified = bscVerifiedSet.has(addr);
				const isCommon = isCommonToken(addr);
				// If API key present: allow Verified OR CG-priced OR curated common list
				// If no API key: allow CG-priced OR curated common list
				return bscscanApiKey ? isVerified || hasCgPrice || isCommon : hasCgPrice || isCommon;
			})
			.sort((a, b) => Number(b.fiatBalance) - Number(a.fiatBalance));

		return visibleTokens;
	} catch (error) {
		console.error({ error });
	}
};

function formatTokens(data, coingeckoPriceMap = new Map()) {
	const erc20Tokens = data.erc20.details || [];

	return erc20Tokens.map((token) => {
		const decimals = parseInt(token.tokenDecimals, 16); // De hexadecimal a número
		const rawBalance = BigInt(token.tokenBalance); // Balance en BigInt
		const amount = Number(rawBalance) / Math.pow(10, decimals); // Balance en unidades normales

		// Prefer CoinGecko price by contract; fallback to 0 if unavailable
		const contractAddress = (token.tokenAddress || "").toLowerCase();
		const priceFromCg = coingeckoPriceMap.get(contractAddress) || 0;
		const price = priceFromCg;
		const fiatBalance = amount * price;

		return {
			_amount: amount,
			_fiatBalance: fiatBalance.toFixed(7),
			_price: price,
			address: token.tokenAddress,
			amount: amount.toFixed(12),
			decimals: decimals,
			fiatBalance: parseFloat(fiatBalance.toFixed(7)),
			image: "", // Puedes después añadir un fetch a CoinMarketCap o una API para obtener imágenes
			name: token.tokenName,
			price: price.toFixed(6),
			symbol: token.tokenSymbol.length <= 10 ? token.tokenSymbol : token.tokenSymbol.substring(0, 10), // Limitamos símbolo si es muy largo
			tokenType: "BEP-20",
		};
	});
}

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

		const lowTime = $("#divLowPrice > div.text-muted").first().text().replace(/\n/g, "").trim().trim();

		const averageTime = $("#divAvgPrice > div.text-muted").text().replace(/\n/g, "").trim().trim();

		const highTime = $("#divHighPrice > div.text-muted").text().replace(/\n/g, "").trim().trim();

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

		const { data } = await instance.get(`${urlBase}/api/evm-tx/bsc-transaction?address=${id}`, {
			headers: {
				Authorization: `Bearer ${token}`,
			},
		});

		return data;
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
const getTransactionsList = async (params, query) => {
	const address = params.id;
	const show = query.show;

	try {
		const { data } = await instance.get(`${urlBase}/api/evm-tx/bsc-transactions?address=${address}&show=${show}`, {
			headers: {
				Authorization: `Bearer ${token}`,
			},
		});

		return {
			pagination: { records: "0", pages: "0", page: "0" },
			transactions: data,
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
