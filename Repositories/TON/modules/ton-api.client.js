const axios = require("axios");
const config = require("../../../Core/config");

const getBaseUrl = () => (config.ton?.indexerUrl || "https://tonapi.io").replace(/\/$/, "");

const normalizeTonRpcUrl = (value) => {
	const rpcUrl = (value || "https://toncenter.com/api/v2/jsonRPC").trim().replace(/\/$/, "");
	return /\/api\/v2$/i.test(rpcUrl) ? `${rpcUrl}/jsonRPC` : rpcUrl;
};

const getHeaders = () => {
	const apiKey = config.ton?.apiKey;
	if (!apiKey) return {};
	return { Authorization: `Bearer ${apiKey}` };
};

const tonApiGet = async (path, params = {}) => {
	const url = `${getBaseUrl()}/v2${path.startsWith("/") ? path : `/${path}`}`;
	const { data } = await axios.get(url, {
		params,
		headers: getHeaders(),
		timeout: config.ton?.timeoutMs || 30000,
	});
	return data;
};

const tonCenterPost = async (method, params = {}) => {
	const rpcUrl = normalizeTonRpcUrl(config.ton?.rpcUrl);
	const body = { id: "1", jsonrpc: "2.0", method, params };
	const headers = { "Content-Type": "application/json" };
	if (config.ton?.apiKey) {
		headers["X-API-Key"] = config.ton.apiKey;
	}
	const { data } = await axios.post(rpcUrl, body, {
		headers,
		timeout: config.ton?.timeoutMs || 30000,
	});
	if (data.error) {
		const err = new Error(data.error.message || "ton_rpc_error");
		err.status = 502;
		throw err;
	}
	return data.result;
};

module.exports = {
	normalizeTonRpcUrl,
	tonApiGet,
	tonCenterPost,
};
