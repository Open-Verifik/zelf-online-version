const { getCleanInstance } = require("../../../Core/axios");
const instance = getCleanInstance(30000);
const urlBase = "https://api.g.alchemy.com";
const api_key = "TB4BTdgdhcoC7ZefWWg4Te-DmQIuYFVG";

const modelTokens = require("../models/tokens.model");

const moduleSui = require("../../sui/modules/sui-scrapping.module");

const moduleBtc = require("../../bitcoin/modules/bitcoin-scrapping.module");

const {
	formatTokens,
	formatTokensSUI,
	formatTokensBTC,
} = require("../modules/formatToken");

const {
	feeAvalanche,
	feeBnb,
	feeEthereum,
	feeSolana,
	feePolygon,
} = require("../modules/fee.module");

const {
	solanaTokens,
	ethereumTokens,
	avalancheTokens,
	polygonTokens,
	bnbTokens,
	suiTokens,
	tokenOklin,
} = require("../modules/tokens.module");
const {
	evm_transactions,
	solana_transactions,
} = require("../modules/transactions.module");

/**
 * Obtiene detalles de un address
 * @param {Array} addresses
 */
const getBalance = async (accounts) => {
	const results = [];
	const exceptions = [];

	for (const { address, network } of accounts) {
		let response;
		switch (network) {
			case "solana":
				response = await solana_mainnet(address);
				if (!response) exceptions.push({ network: "solana", address });
				break;
			case "evm":
				response = await evm_mainnet(address);
				if (!response) exceptions.push({ network: "evm", address });
				break;
			case "bitcoin":
				response = await bitcoin_mainnet(address);
				if (!response) exceptions.push({ network: "bitcoin", address });
				break;
			case "sui":
				response = await sui_mainnet(address);

				if (!response) exceptions.push({ network: "sui", address });
				break;
		}

		if (response) results.push(...response);
	}

	if (!results.length) {
		const error = new Error("address_not_found");
		error.status = 404;
		throw error;
	}

	return { results, exceptions };
};
/**
 * Obtiene detalles de una transacción
 * @param {Array} addresses
 */
const getTransactions = async (addresses, limit) => {
	const results = [];
	const exceptions = [];

	for (const { address, network } of addresses) {
		const limit_ = limit.toString();

		let response;
		switch (network) {
			case "solana":
				response = await solana_transactions(address, limit_);
				if (!response) exceptions.push({ network: "solana", address });
				break;
			case "evm":
				response = await evm_transactions(address, limit_);
				if (!response) exceptions.push({ network: "evm", address });
				break;
			case "bitcoin":
				// response = await bitcoin_mainnet(address);
				// if (!response) errors.push({ network: "bitcoin", address });
				break;
			case "sui":
				// response = await sui_mainnet(address);
				// if (!response) errors.push({ network: "sui", address });
				break;
		}

		if (response) results.push(...response);
	}

	if (!results.length) {
		const error = new Error("address_not_found");
		error.status = 404;
		throw error;
	}

	return { results, exceptions };
};

const getTokens = async (network, name, explore = false) => {
	if (!explore) {
		try {
			const query = {
				network,
				name: { $regex: name, $options: "i" },
			};

			return await modelTokens
				.find(query)
				.select(
					"name symbol tokenContractAddress network logo tokenType decimals -_id"
				);
		} catch (error) {
			console.error("Error al buscar tokens:", error);
			return [];
		}
	}

	const fetchers = {
		ethereum: ethereumTokens,
		solana: solanaTokens,
		avalanche: avalancheTokens,
		polygon: polygonTokens,
		bnb: bnbTokens,
		sui: suiTokens,
	};

	const fetcher = fetchers[network];

	if (fetcher) {
		return await fetcher(network, name);
	}

	return [];
};

const networkFee = async (network) => {
	let response;
	switch (network) {
		case "ethereum":
			response = await feeEthereum(network);
			break;
		case "solana":
			response = await feeSolana(network);
			break;
		case "polygon":
			response = await feePolygon(network);
			break;
		case "avalanche":
			response = await feeAvalanche(network);
			break;
		case "bnb":
			response = await feeBnb(network);
			break;
	}

	return response;
};
/**
 * Obtiene detalles informacion de  direcciones de EVM
 * @param {String} address
 */
const evm_mainnet = async (address) => {
	try {
		const { data } = await instance.post(
			`${urlBase}/data/v1/${api_key}/assets/tokens/by-address`,
			{
				addresses: [
					{
						address: address,
						networks: [
							"eth-mainnet",
							"bnb-mainnet",
							"avax-mainnet",
							"matic-mainnet",
						],
					},
				],
				withMetadata: true,
				withPrices: true,
				includeNativeTokens: true,
			}
		);

		return formatTokens(data.data, address);
	} catch (error) {
		return null;
	}
};

/**
 * Obtiene detalles informacion de  direcciones de  solana
 * @param {String} address
 */
const solana_mainnet = async (address) => {
	try {
		const { data } = await instance.post(
			`${urlBase}/data/v1/${api_key}/assets/tokens/by-address`,
			{
				addresses: [
					{
						address: address,
						networks: ["solana-mainnet"],
					},
				],
				withMetadata: true,
				withPrices: true,
				includeNativeTokens: true,
			}
		);

		if (!data.data.tokens.length) return null;

		return formatTokens(data.data, address);
	} catch (error) {
		return null;
	}
};
/**
 * Obtiene detalles informacion de  direcciones de bitcoin
 * @param {String} address
 */
const bitcoin_mainnet = async (address) => {
	try {
		const response = await moduleBtc.getBalance({
			id: address,
			transactions: true,
		});

		const data = await formatTokensBTC(response);

		return data;
	} catch (error) {
		return null;
	}
};
/**
 * Obtiene detalles informacion de  direcciones de sui
 * @param {String} address
 */
const sui_mainnet = async (address) => {
	try {
		const response = await moduleSui.getAddress({
			id: address,
			transactions: true,
		});
		const data = await formatTokensSUI(response);

		return data;
	} catch (error) {
		return null;
	}
};

module.exports = {
	getBalance,
	getTransactions,
	networkFee,
	getTokens,
	tokenOklin,
};
