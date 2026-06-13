/**
 * Shared SourceA NaaS session id for default Blockbook / JSON-RPC base URLs.
 * Set SOURCE_A_SESSION_ID and SOURCE_A_*_HOST in .env (see .env.example),
 * or set per-chain *_BOOK_FALLBACK_URL to override the full base URL.
 */
require("dotenv").config();

const sessionId = () => {
	const id = (process.env.SOURCE_A_SESSION_ID || "").trim();
	if (!id) {
		throw new Error(
			"SOURCE_A_SESSION_ID is not set in .env (required for SourceA NaaS default URLs unless each chain has *_BOOK_FALLBACK_URL)",
		);
	}
	return id;
};

const sessionPath = () => `/naas/session/${sessionId()}`;

const buildUrl = (hostEnvKey) => {
	const host = (process.env[hostEnvKey] || process.env.SOURCE_A_DEFAULT_HOST || "").trim();
	if (!host) {
		throw new Error(
			`${hostEnvKey} (or SOURCE_A_DEFAULT_HOST) is not set in .env`,
		);
	}
	return `https://${host}${sessionPath()}`;
};

module.exports = {
	sessionId,
	/** BTC Blockbook base URL */
	btcBookFallbackDefaultUrl: () => buildUrl("SOURCE_A_BTC_HOST"),
	/** Solana JSON-RPC base URL */
	solanaBookFallbackDefaultUrl: () => buildUrl("SOURCE_A_SOLANA_HOST"),
	/** Polygon JSON-RPC base URL */
	polygonBookFallbackDefaultUrl: () => buildUrl("SOURCE_A_POLYGON_HOST"),
	/** Ethereum JSON-RPC base URL */
	ethereumBookFallbackDefaultUrl: () => buildUrl("SOURCE_A_ETHEREUM_HOST"),
	/** BSC JSON-RPC base URL */
	bscBookFallbackDefaultUrl: () => buildUrl("SOURCE_A_BSC_HOST"),
};
