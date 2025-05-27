const config = require("../../../Core/config");
const { getCleanInstance } = require("../../../Core/axios");

const instance = getCleanInstance(30000);

const LIFI_API_URL = config.lifi.url;
const LIFI_API_KEY = config.lifi.apiKey;
const LIFI_INTEGRATOR = config.lifi.integrator;

const headers = {
	headers: { "x-api-key": LIFI_API_KEY },
};

const EXECUTE_SOLANA_SWAP_REQUIRED_PARAMS = {
	fromChain: true,
	id: true,
	tool: true,
	type: true,
	action: {
		fromAddress: true,
		fromAmount: true,
		fromChainId: true,
		fromToken: true,
		slippage: true,
		toAddress: true,
		toChainId: true,
	},
};

const getChains = async (params) => {
	const { data } = await instance.get(`${LIFI_API_URL}/chains`, { params, headers });

	return data;
};

const getQuote = async (params) => {
	const { data } = await instance.get(`${LIFI_API_URL}/quote`, { params: { ...params, integrator: LIFI_INTEGRATOR }, headers });

	return data;
};

const getStatus = async (params) => {
	const { data } = await instance.get(`${LIFI_API_URL}/status`, { params, headers });

	return data;
};

const getTokenByChainId = async (params) => {
	const { data } = await instance.get(`${LIFI_API_URL}/token`, { params, headers });

	return data;
};

const getTokens = async (params) => {
	const { data } = await instance.get(`${LIFI_API_URL}/tokens`, { params, headers });

	return data;
};

const getTools = async (params) => {
	const { data } = await instance.get(`${LIFI_API_URL}/tools`, { params, headers });

	return data;
};

const executeSolanaSwap = async (params) => {
	const requiredParams = Object.keys(EXECUTE_SOLANA_SWAP_REQUIRED_PARAMS);

	let missingParams = requiredParams.filter((param) => !params[param]);
	let missingActionParams = Object.keys(params?.action || {}).filter((param) => !params?.action?.[param]);

	if (missingParams.length > 0 || missingActionParams.length > 0) {
		throw new Error(
			`Missing required parameters: ${missingParams.join(", ")} ${
				missingActionParams.length > 0 ? `action.${missingActionParams.join(", action.")}` : ""
			}`
		);
	}

	const { data } = await instance.post(`${LIFI_API_URL}/advanced/stepTransaction`, { ...params, integrator: LIFI_INTEGRATOR }, headers);

	return data;
};

module.exports = {
	getChains,
	getQuote,
	getStatus,
	getTokenByChainId,
	getTokens,
	getTools,
	executeSolanaSwap,
};
