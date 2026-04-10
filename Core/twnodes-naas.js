/**
 * Shared twnodes NaaS session id for default Blockbook / JSON-RPC base URLs.
 * Set TWNODES_NAAS_SESSION_ID in .env (see .env.example for endpoint list).
 */
require("dotenv").config();

const DEFAULT_TWNODES_NAAS_SESSION_ID = "MGQ5YzI5OGMtOGNlMi00NjQzLWIyMWYtODcxNDIxMGJlYTMx";

const sessionId = () => process.env.TWNODES_NAAS_SESSION_ID || DEFAULT_TWNODES_NAAS_SESSION_ID;

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
