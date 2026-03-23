const moment = require("moment");

function tagPayLegacyCumulativeConfirmation() {
	return process.env.TAG_PAY_LEGACY_CUMULATIVE_CONFIRMATION === "true";
}

/** Seconds subtracted from session start so txs slightly before JWT issuance still count (clock skew). */
function tagPaySessionTxSkewSec() {
	const n = Number(process.env.TAG_PAY_SESSION_TX_SKEW_SEC);
	return Number.isFinite(n) && n >= 0 ? n : 60;
}

function parseTagPayAmount(amountToPay) {
	const n = typeof amountToPay === "number" ? amountToPay : Number(amountToPay);
	if (!Number.isFinite(n) || n < 0) return null;
	return n;
}

function coerceInitiatedAtUnix(raw) {
	if (raw == null || raw === "") return null;
	const n = Number(raw);
	return Number.isFinite(n) ? Math.floor(n) : null;
}

/** Unix seconds for a normalized transaction row; null if unknown (excluded from session-scoped sums). */
function txUnixSeconds(tx) {
	if (!tx || typeof tx !== "object") return null;
	const asUnix = (v) => {
		if (v == null || v === "") return null;
		const num = typeof v === "number" ? v : Number(v);
		if (!Number.isFinite(num)) return null;
		if (num > 1e12) return Math.floor(num / 1000);
		return Math.floor(num);
	};
	const direct = asUnix(tx.timestamp) ?? asUnix(tx.blocktime) ?? asUnix(tx.blockTime) ?? asUnix(tx.timeStamp);
	if (direct != null) return direct;
	if (typeof tx.date === "string" && tx.date !== "N/A") {
		const strict = moment(tx.date, "YYYY-MM-DD HH:mm:ss", true);
		if (strict.isValid()) return strict.unix();
		const loose = moment(tx.date);
		if (loose.isValid()) return loose.unix();
	}
	return null;
}

function isInboundTraffic(tx) {
	return String(tx?.traffic || "").toUpperCase() === "IN";
}

/**
 * IN transactions at or after (initiatedAtUnix - skew). Missing initiatedAt: [] unless legacy env is on (then all IN).
 * @param {Array} transactions
 * @param {number|null|undefined} initiatedAtUnix
 * @returns {Array}
 */
function filterSessionInboundTransactions(transactions, initiatedAtUnix) {
	const list = Array.isArray(transactions) ? transactions : [];
	const skew = tagPaySessionTxSkewSec();
	const cutoff = initiatedAtUnix != null ? initiatedAtUnix - skew : null;
	if (cutoff == null) {
		if (tagPayLegacyCumulativeConfirmation()) {
			return list.filter(isInboundTraffic);
		}
		return [];
	}
	return list.filter((t) => {
		if (!isInboundTraffic(t)) return false;
		const ts = txUnixSeconds(t);
		if (ts == null) return false;
		return ts >= cutoff;
	});
}

module.exports = {
	tagPayLegacyCumulativeConfirmation,
	tagPaySessionTxSkewSec,
	parseTagPayAmount,
	coerceInitiatedAtUnix,
	txUnixSeconds,
	filterSessionInboundTransactions,
};
