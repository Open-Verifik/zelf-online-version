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

const toTonUpstreamError = (error, fallback = "ton_balance_unavailable") => {
	const upstreamStatus = Number(error?.response?.status || 0);

	if (upstreamStatus === 400) {
		const err = new Error("invalid_ton_address");
		err.status = 409;
		return err;
	}
	if (upstreamStatus === 403) {
		const err = new Error("ton_api_forbidden");
		err.status = 403;
		return err;
	}
	if (upstreamStatus === 429) {
		const err = new Error("ton_api_rate_limited");
		err.status = 429;
		return err;
	}
	if (upstreamStatus === 401) {
		const err = new Error("ton_api_unauthorized");
		err.status = 403;
		return err;
	}

	const err = new Error(fallback);
	err.status = 502;
	return err;
};

const tonCenterPost = async (method, params = {}) => {
	const rpcUrl = normalizeTonRpcUrl(config.ton?.rpcUrl);
	const body = { id: "1", jsonrpc: "2.0", method, params };
	const headers = { "Content-Type": "application/json" };
	if (config.ton?.apiKey) {
		headers["X-API-Key"] = config.ton.apiKey;
	}
	let data;
	try {
		({ data } = await axios.post(rpcUrl, body, {
			headers,
			timeout: config.ton?.timeoutMs || 30000,
		}));
	} catch (error) {
		const upstreamMessage =
			error?.response?.data?.error ||
			error?.response?.data?.message ||
			error?.message ||
			"ton_rpc_error";
		const rpcError = new Error(upstreamMessage);
		rpcError.status = error?.response?.status === 429 ? 429 : 502;
		rpcError.code = error?.code || "TON_RPC_ERROR";
		throw rpcError;
	}
	if (data.error) {
		const err = new Error(data.error.message || "ton_rpc_error");
		err.status = 502;
		throw err;
	}
	return data.result;
};

module.exports = {
	normalizeTonRpcUrl,
	toTonUpstreamError,
	tonApiGet,
	tonCenterPost,
};
