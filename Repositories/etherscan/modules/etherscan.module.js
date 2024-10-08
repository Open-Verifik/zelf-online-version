const config = require("../../../Core/config");
const { getCleanInstance } = require("../../../Core/axios");
const instance = getCleanInstance(30000);

/**
 * @param {*} params
 */

const getBalance = async (params) => {
	const { data } = await instance.get(
		`${config.etherscan.urlEtherscan}?module=account&action=balance&address=${params.address}&tag=latest&apikey=${config.etherscan.apiKey}`
	);

	return { balance: data.result };
};

const getBlocke = async () => {
	const { data } = await instance.get(`${config.etherscan.urlEtherscan}?module=proxy&action=eth_blockNumber&apikey=${config.etherscan.apiKey}`);

	const decimalNumber = parseInt(data.result, 16);
	return { blockNumber: decimalNumber };
};

/**
 * @param {*} params
 */

const getTransactions = async (params) => {
	const { data } = await instance.get(
		`${config.etherscan.urlEtherscan}?module=account&address=${params.address}&offset=40&sort=desc&action=tokentx&tag=latest&page=1&apikey=${config.etherscan.apiKey}`
	);

	return { transactions: data.result };
};

const getTokentx = async (params) => {
	let { data } = await instance.get(
		`${config.etherscan.urlEtherscan}?module=account&action=tokentx&address=${params.address}&startblock=0&endblock=99999999&sort=asc&apikey=${config.etherscan.apiKey}`
	);

	return { tokentx: data.result };
};

const getGasTracker = async () => {
	const { data } = await instance.get(`${config.etherscan.urlEtherscan}?module=gastracker&action=gasoracle&apikey=${config.etherscan.apiKey}`);

	return data.result;
};

module.exports = {
	getTransactions,
	getGasTracker,
	getBalance,
	getTokentx,
	getBlocke,
};
