const { getCleanInstance } = require("../../../Core/axios");
const instance = getCleanInstance(30000);
const { generateRandomUserAgent } = require("../../../Core/helpers");
const endpoint = `https://api-v2.solscan.io/v2`;
const XRPSCAN_BASE = "https://api.xrpscan.com/api/v1";

const xrpscanHeaders = () => ({
	Accept: "application/json",
	"User-Agent": generateRandomUserAgent(),
});

const isRetryableXrpscanError = (error) => {
	const code = error?.code;
	if (code === "ECONNABORTED" || code === "ETIMEDOUT" || code === "ECONNRESET" || code === "EAI_AGAIN" || code === "ENOTFOUND") {
		return true;
	}
	const status = error?.response?.status;
	if (status === 429) return true;
	if (status >= 500 && status < 600) return true;
	if (!error?.response && /timeout/i.test(error?.message || "")) return true;
	return false;
};

const fetchXrpscan = async (path, { label = "XRP xrpscan", attempts = 3 } = {}) => {
	let lastError;
	for (let attempt = 1; attempt <= attempts; attempt++) {
		try {
			return await instance.get(`${XRPSCAN_BASE}${path}`, {
				headers: xrpscanHeaders(),
			});
		} catch (error) {
			lastError = error;
			const status = error?.response?.status;
			if (status === 404 || status === 400) throw error;
			if (!isRetryableXrpscanError(error) || attempt === attempts) break;
			const delayMs = 400 * attempt;
			console.warn(`${label} attempt ${attempt}/${attempts} failed (${error.message}); retrying in ${delayMs}ms`);
			await new Promise((resolve) => setTimeout(resolve, delayMs));
		}
	}
	throw lastError;
};

const normalizeTransactionsPayload = (data) => {
	if (Array.isArray(data)) return data;
	if (data && Array.isArray(data.transactions)) return data.transactions;
	return [];
};

/**
 * @param {*} params
 */

const getAddress = async (params) => {
	try {
		const { data } = await instance.get(`https://api.xrpscan.com/api/v1/account/${params.id}`, {
			headers: {
				"user-agent": generateRandomUserAgent(),
			},
		});

		const _response = {
			address: params.id,
			balance: data.Balance / 1_000_000_000,
			type: "", //result.type,
			fiatBalance: 0,
			account: {
				asset: "XRP",
				fiatValue: "0",
				price: "0",
			},
			tokenHoldings: null,
		};

		_response.tokenHoldings = await getTokens(`${params.id}`);

		if (_response.tokenHoldings.balance) _response.fiatBalance += _response.tokenHoldings.balance;

		return _response;
	} catch (error) {
		console.error({ error });
	}
};

/**
 * get transactions list
 * @param {Object} params
 * @returns
 */
const getTransactionsList = async (params, query = {}) => {
	const address = String(params?.id || "").trim();
	if (!address) {
		const error = new Error("missing_address");
		error.status = 400;
		throw error;
	}

	const limit = Math.min(100, Math.max(1, parseInt(String(query?.show), 10) || 25));
	const searchParams = new URLSearchParams({ limit: String(limit) });
	if (query?.marker) searchParams.set("marker", String(query.marker));

	try {
		const { data } = await fetchXrpscan(`/account/${encodeURIComponent(address)}/transactions?${searchParams}`, {
			label: "XRP transactions",
		});

		const transactions = normalizeTransactionsPayload(data);
		const marker = data && typeof data === "object" && !Array.isArray(data) ? data.marker : undefined;

		return {
			transactions,
			...(marker ? { marker } : {}),
		};
	} catch (error) {
		const status = error?.response?.status;
		if (status === 404) {
			return { transactions: [] };
		}

		console.error("XRP transactions fetch failed:", {
			address,
			status: status || null,
			code: error?.code || null,
			message: error?.message,
		});

		return { transactions: [] };
	}
};

/**
 * get transaction status
 * @param {Object} params
 */
const getTokens = async (params) => {
	const { data } = await instance.get(`https://api.xrpscan.com/api/v1/account/${params}/assets`, {
		headers: {
			"user-agent": generateRandomUserAgent(),
		},
	});

	const tokenHoldings = {
		total: data.length,
		balance: 0,
		fiatBalance: 0,
		tokens: [],
	};

	try {
		for (let index = 0; index < data.length; index++) {
			const token = data[index];

			tokenHoldings.fiatBalance += token.value;

			tokenHoldings.tokens.push({
				fiatBalance: token.value,
				counterparty: token.counterparty,
				currency: token.currency,
			});
		}
	} catch (exception) {
		console.error({ exception });
	}

	return tokenHoldings;
};

module.exports = {
	getAddress,
	getTransactionsList,
	getTokens,
	normalizeTransactionsPayload,
};
