/**
 * Shared twnodes NaaS session id for default Blockbook / JSON-RPC base URLs.
 * Set TW_SESSION_ID in .env (see .env.example), or set per-chain *_BOOK_FALLBACK_URL to a full base URL.
 */
require("dotenv").config();

const sessionId = () => {
	const id = (process.env.TW_SESSION_ID || "").trim();
	if (!id) {
		throw new Error(
			"TW_SESSION_ID is not set in .env (required for twnodes NaaS default URLs unless each chain has *_BOOK_FALLBACK_URL)",
		);
	}
	return id;
};

const sessionPath = () => `/naas/session/${sessionId()}`;

module.exports = {
	sessionId,
	/** https://btc-book.twnodes.com/naas/session/<id> */
	btcBookFallbackDefaultUrl: () => `https://btc-book.twnodes.com${sessionPath()}`,
	/** https://solana.twnodes.com/naas/session/<id> */
	solanaBookFallbackDefaultUrl: () => `https://solana.twnodes.com${sessionPath()}`,
	/** https://polygon.twnodes.com/naas/session/<id> */
	polygonBookFallbackDefaultUrl: () => `https://polygon.twnodes.com${sessionPath()}`,
	/** https://ethereum.twnodes.com/naas/session/<id> */
	ethereumBookFallbackDefaultUrl: () => `https://ethereum.twnodes.com${sessionPath()}`,
	/** https://bsc.twnodes.com/naas/session/<id> */
	bscBookFallbackDefaultUrl: () => `https://bsc.twnodes.com${sessionPath()}`,
};
