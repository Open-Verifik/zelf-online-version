const { getCleanInstance } = require("../../../Core/axios");
const instance = getCleanInstance(30000);
const { generateRandomUserAgent } = require("../../../Core/helpers");
const moment = require("moment");
const { getTickerPrice } = require("../../binance/modules/binance.module");

const HORIZON_URL = "https://horizon.stellar.org";
const STROOPS_TO_XLM = 1 / 10_000_000;

/**
 * Extract to/amount from operation (payment or asset_balance_changes)
 */
const extractPaymentInfo = (op) => {
	if (!op) return { to: null, amount: null, asset: "XLM" };
	// Payment type
	if (op.type === "payment" && op.to) {
		return {
			to: op.to,
			amount: parseFloat(op.amount) || null,
			asset: op.asset_type === "native" ? "XLM" : op.asset_code || "XLM",
		};
	}
	// Asset balance changes (contracts, etc.)
	if (op.asset_balance_changes && op.asset_balance_changes.length > 0) {
		const first = op.asset_balance_changes[0];
		const total = op.asset_balance_changes.reduce(
			(sum, c) => sum + (parseFloat(c.amount) || 0),
			0
		);
		return {
			to: first.to || null,
			amount: total || null,
			asset: first.asset_code || first.asset_type || "XLM",
		};
	}
	return { to: null, amount: null, asset: "XLM" };
};

/**
 * Fetch operations for a transaction to get to/amount
 */
const fetchTransactionOperations = async (txHash) => {
	try {
		const { data } = await instance.get(
			`${HORIZON_URL}/transactions/${txHash}/operations?limit=1`,
			{ headers: { "user-agent": generateRandomUserAgent() } }
		);
		const ops = data._embedded?.records || [];
		return ops[0] ? extractPaymentInfo(ops[0]) : { to: null, amount: null, asset: "XLM" };
	} catch {
		return { to: null, amount: null, asset: "XLM" };
	}
};

/**
 * Format transaction - solo datos relevantes para vista rápida
 */
const formatSingleTransaction = (tx, userAddress, paymentInfo = {}) => {
	try {
		if (!tx || typeof tx !== "object") return null;
		if (!tx._links && tx.hash && typeof tx.traffic !== "undefined") return tx;

		const txDate = moment.utc(tx.created_at);
		const isOutgoing = tx.source_account === userAddress;
		const feeXLM = ((parseInt(tx.fee_charged || 0, 10) || 0) * STROOPS_TO_XLM).toString();

		return {
			hash: tx.hash || tx.id,
			from: tx.source_account || "",
			to: paymentInfo.to ?? null,
			amount: paymentInfo.amount ?? null,
			asset: paymentInfo.asset ?? "XLM",
			date: txDate.isValid() ? txDate.format("YYYY-MM-DD") : "",
			time: txDate.isValid() ? txDate.format("HH:mm:ss") : "",
			age: txDate.isValid() ? txDate.fromNow() : "",
			fee: feeXLM,
			status: tx.successful ? "Success" : "Failed",
			traffic: isOutgoing ? "OUT" : "IN",
		};
	} catch (err) {
		console.error("Stellar formatSingleTransaction error:", err.message);
		return null;
	}
};

/**
 * Format transactions with payment info (to, amount)
 */
const formatTransactions = async (transactions, userAddress) => {
	if (!Array.isArray(transactions)) return [];

	const opsPromises = transactions.map((tx) =>
		fetchTransactionOperations(tx.hash || tx.id)
	);
	const paymentInfos = await Promise.all(opsPromises);

	return transactions
		.map((tx, i) => formatSingleTransaction(tx, userAddress, paymentInfos[i]))
		.filter(Boolean);
};

/**
 * Get Stellar account balance, details and transactions
 * @param {Object} params - { id: account_id }
 * @param {Object} query - { limit, show, cursor } for transactions pagination
 * @returns {Object} Account data with balance, token holdings and transactions
 */
const getAddress = async (params, query = {}) => {
	try {
		const { data } = await instance.get(`${HORIZON_URL}/accounts/${params.id}`, {
			headers: {
				"user-agent": generateRandomUserAgent(),
			},
		});

		let xlmBalance = 0;
		const tokenHoldings = {
			total: 0,
			balance: 0,
			fiatBalance: 0,
			tokens: [],
		};

		if (data.balances && data.balances.length > 0) {
			for (const balance of data.balances) {
				const balanceValue = parseFloat(balance.balance);
				const assetInfo = {
					asset: balance.asset_type === "native" ? "XLM" : balance.asset_code,
					issuer: balance.asset_type === "native" ? null : balance.asset_issuer,
					balance: balanceValue,
					fiatBalance: 0,
				};

				if (balance.asset_type === "native") {
					xlmBalance = balanceValue;
				} else {
					tokenHoldings.tokens.push(assetInfo);
					tokenHoldings.balance += balanceValue;
				}
			}
			tokenHoldings.total = tokenHoldings.tokens.length;
		}

		let xlmPrice = 0;
		try {
			const { price } = await getTickerPrice({ symbol: "XLM" });
			xlmPrice = parseFloat(price) || 0;
		} catch (err) {
			console.error("Stellar getTickerPrice error:", err?.message);
		}

		const xlmFiatBalance = xlmBalance * xlmPrice;

		const _response = {
			address: params.id,
			balance: xlmBalance,
			type: data.type || "account",
			fiatBalance: xlmFiatBalance,
			account: {
				asset: "XLM",
				fiatValue: xlmFiatBalance.toFixed(5),
				price: String(xlmPrice),
			},
			tokenHoldings,
			transactions: [],
			transactionsNext: false,
		};

		if (tokenHoldings.fiatBalance) _response.fiatBalance += tokenHoldings.fiatBalance;

		// Include transactions in the response (always return array, empty if none)
		try {
			const transactionsData = await getTransactionsList(params, query);
			_response.transactions = Array.isArray(transactionsData?.transactions)
				? transactionsData.transactions
				: [];
			_response.transactionsNext = Boolean(transactionsData?.next);
		} catch (err) {
			console.error("Stellar transactions fetch error:", err.message);
		}

		return _response;
	} catch (error) {
		console.error({ error });
		throw error;
	}
};

/**
 * Get transactions list for a Stellar account
 * @param {Object} params - { id: account_id }
 * @param {Object} query - { limit, cursor, show }
 * @returns {Object} Transactions list (formatted)
 */
const getTransactionsList = async (params, query) => {
	try {
		// Support both Horizon (limit/cursor) and XRP-style (page/show) params
		const limit = parseInt(query.limit || query.show || 10, 10) || 10;
		const cursor = query.cursor || "";

		let url = `${HORIZON_URL}/accounts/${params.id}/transactions?limit=${limit}&order=desc`;
		if (cursor) url += `&cursor=${cursor}`;

		const { data } = await instance.get(url, {
			headers: {
				"user-agent": generateRandomUserAgent(),
			},
		});

		const rawTransactions = data._embedded?.records || [];
		const accountId = params.id || "";
		const formattedTransactions = await formatTransactions(rawTransactions, accountId);

		return {
			transactions: formattedTransactions,
			next: rawTransactions.length === limit,
		};
	} catch (error) {
		console.error({ error });
		throw error;
	}
};

/**
 * Get single transaction details
 * @param {Object} params - { id: transaction_hash }
 * @returns {Object} Transaction details
 */
const getTransactionDetail = async (params) => {
	try {
		const { data } = await instance.get(`${HORIZON_URL}/transactions/${params.id}`, {
			headers: {
				"user-agent": generateRandomUserAgent(),
			},
		});

		return data;
	} catch (error) {
		console.error({ error });
		throw error;
	}
};

module.exports = {
	getAddress,
	getTransactionsList,
	getTransactionDetail,
};
