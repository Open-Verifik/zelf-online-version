const networks_ = require("../src/network.json");
const modelTokens = require("../models/tokens.model");
function formatTokenBalance(balanceHex, decimals = 18) {
	if (
		typeof balanceHex !== "string" ||
		!balanceHex.startsWith("0x") ||
		balanceHex === "0x" ||
		balanceHex === null
	) {
		return "0";
	}

	try {
		const balanceBigInt = BigInt(balanceHex);
		const divisor = BigInt(10) ** BigInt(decimals);
		const wholePart = balanceBigInt / divisor;
		const fractionalPart = balanceBigInt % divisor;
		const fractionalStr = fractionalPart
			.toString()
			.padStart(Number(decimals), "0");
		return `${wholePart}.${fractionalStr}`.replace(/\.?0+$/, "");
	} catch (error) {
		console.error("Error formatting balance:", error, balanceHex);
		return "0";
	}
}

async function formatTokens(input) {
	const groupedByNetwork = {};

	for (const token of input.tokens) {
		const network = token.network;

		console.log({ network });
		let symbol = "",
			name = "",
			logo = "";

		// Fetch network info once
		const res_network = buscarPorNetwork(network);
		if (res_network) {
			symbol = res_network.symbol;
			name = res_network.name;
			logo = res_network.logo;
		}

		if (!groupedByNetwork[network]) {
			groupedByNetwork[network] = {
				network: network,
				account: {
					amount: "0",
					fiatBalance: 0,
					currency: "usd",
					walletAddress: token.address,
					decimals: 18,
					logo,
					name,
					symbol,
					assets: [],
				},
			};
		}

		const priceInfo = token.tokenPrices?.[0];
		const price = priceInfo ? parseFloat(priceInfo.value) : 0;

		if (!token.tokenAddress) {
			const decimals = 18;
			const amountFormatted = formatTokenBalance(token.tokenBalance, decimals);
			groupedByNetwork[network].account = {
				...groupedByNetwork[network].account,
				amount: amountFormatted,
				decimals,
				fiatBalance: parseFloat(amountFormatted) * price,
				logo,
			};
		} else {
			const decimals = token.tokenMetadata?.decimals || 18;
			const amountFormatted = formatTokenBalance(token.tokenBalance, decimals);

			try {
				const query = {
					network: name,
					tokenContractAddress: { $regex: token.tokenAddress, $options: "i" },
				};

				const tokens = await modelTokens
					.find(query)
					.select(
						"name symbol tokenContractAddress network logo tokenType decimals -_id"
					);
				//console.log(tokens[0].symbol);
				groupedByNetwork[network].account.assets.push({
					tokenType: tokens?.[0]?.tokenType || "",
					fiatBalance: parseFloat(amountFormatted) * price,
					symbol: token.tokenMetadata?.symbol || "",
					name: token.tokenMetadata?.name || "",
					price,
					logo: tokens?.[0]?.logo || "",
					decimals,
					amount: amountFormatted,
					tokenContractAddress: token.tokenAddress,
				});
			} catch (error) {
				console.error("Error fetching token metadata:", error);
			}
		}
	}

	return Object.values(groupedByNetwork);
}

async function formatTokensSUI(input) {
	try {
		// Buscar la red 'sui-mainnet'
		const res_network = buscarPorNetwork("sui-mainnet");
		if (!res_network) {
			throw new Error("No se encontró la red 'sui-mainnet'");
		}

		const symbol = res_network.symbol || "";
		const name = res_network.name || "";
		const logo = res_network.logo || "";

		// Función para formatear los tokens
		async function formatearTokens(tokens) {
			const result = [];

			for (const token of tokens) {
				const query = {
					network: name,
					tokenContractAddress: { $regex: token.address_token, $options: "i" },
				};

				const foundTokens = await modelTokens
					.find(query)
					.select(
						"name symbol tokenContractAddress network logo tokenType decimals price image -_id"
					);

				for (const t of foundTokens) {
					result.push({
						tokenType: t.tokenType || "",
						fiatBalance: parseFloat(token.fiatBalance) || 0,
						symbol: t.symbol || "",
						name: t.name || "",
						price: parseFloat(token.price) || 0,
						logo: t.logo || "",
						decimals: t.decimals,
						amount: token.amount,
						tokenContractAddress: t.tokenContractAddress,
					});
				}
			}

			return result;
		}

		// Formatear los tokens y armar el resultado
		const assets = await formatearTokens(input.tokenHoldings.tokens);

		const data = {
			network: "sui-mainnet",
			account: {
				amount: input.balance,
				fiatBalance: input.fiatBalance,
				currency: "usd",
				walletAddress: input.address,
				decimals: 9,
				logo,
				name,
				symbol,
				assets,
			},
		};

		return [data];
	} catch (error) {
		return null;
	}
}
async function formatTokensBTC(input) {
	try {
		const res_network = buscarPorNetwork("btc-mainnet");
		if (!res_network) {
			throw new Error("No se encontró la red 'btc-mainnet'");
		}

		const symbol = res_network.symbol || "";
		const name = res_network.name || "";
		const logo = res_network.logo || "";

		const data = {
			network: "bitcoin-mainnet",
			account: {
				amount: input.balance,
				fiatBalance: input.fiatBalance,
				currency: "usd",
				walletAddress: input.address,
				decimals: 9,
				logo,
				name,
				symbol,
				assets: [],
			},
		};

		return [data];
	} catch (error) {
		return null;
	}
}
function buscarPorNetwork(networkName) {
	return networks_.networks.find((n) => n.network === networkName);
}
module.exports = { formatTokens, formatTokensSUI, formatTokensBTC };
