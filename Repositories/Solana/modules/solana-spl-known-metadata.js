const config = require("../../../Core/config");

const ZNS_MAINNET_MINT = "GfF6PSkH8bKLkws5RMFdzgASwcVbgCfhhKfp8zeoFBkx";
const WSOL_MINT = "So11111111111111111111111111111111111111112";

const ZNS_DISPLAY = {
	name: "Zelf",
	symbol: "ZNS",
	image: "https://cdn.zelf.world/logos/zelf_logo_black_svg.svg",
};

const WSOL_DISPLAY = {
	name: "Wrapped SOL",
	symbol: "WSOL",
	image: "https://static.oklink.com/cdn/web3/currency/token/large/501-So11111111111111111111111111111111111111112-110/type=default_90_0",
};

/** Same visual pipeline as `WSOL_DISPLAY` — keeps logos on a stable CDN without Jupiter. */
const oklinkSplIcon = (mint) =>
	`https://static.oklink.com/cdn/web3/currency/token/large/501-${mint}-110/type=default_90_0`;

/**
 * High-volume / established mainnet mints. Applied in Source A before Jupiter so we skip
 * API calls for tokens that are effectively static in metadata.
 * Extended from Solana mainnet token-list (chainId 101) + official project mints — not arbitrary.
 * (Jupiter still fills any mint not covered here or by ZNS/WSOL above.)
 */
const STATIC_POPULAR_SPL_BY_MINT = {
	// Stablecoins
	"EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v": {
		name: "USD Coin",
		symbol: "USDC",
		image: oklinkSplIcon("EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v"),
	},
	"Es9vMFrzaCERmJfrF4H2FYD4KCoNkY11McCe8BenwNYB": {
		name: "USDT",
		symbol: "USDT",
		image: oklinkSplIcon("Es9vMFrzaCERmJfrF4H2FYD4KCoNkY11McCe8BenwNYB"),
	},
	// DEX / aggregators
	"4k3Dyjzvzp8eMZWUXbBCjEvwSkkk59S5fCNXvuFsLQeN": {
		name: "Raydium",
		symbol: "RAY",
		image: oklinkSplIcon("4k3Dyjzvzp8eMZWUXbBCjEvwSkkk59S5fCNXvuFsLQeN"),
	},
	"orcaEKTdK7Lvmignwdv0UMvDM67A8DcuGtZ2n1jP9C": {
		name: "Orca",
		symbol: "ORCA",
		image: oklinkSplIcon("orcaEKTdK7Lvmignwdv0UMvDM67A8DcuGtZ2n1jP9C"),
	},
	"JUPyiwrYJFskUPiHa7hkeR8VUtAeFoSYbKedZNsDvCN": {
		name: "Jupiter",
		symbol: "JUP",
		image: "https://static.jup.ag/jup/icon.png",
	},
	// Liquid staking / LSTs
	"mSoLzYCxHdYgdzU16g5QSh3i5K3z3KZK7ytfqcJm7So": {
		name: "Marinade staked SOL",
		symbol: "mSOL",
		image: oklinkSplIcon("mSoLzYCxHdYgdzU16g5QSh3i5K3z3KZK7ytfqcJm7So"),
	},
	"J1tSo1ZHTdN76rbsrGCkTF4EYK4mzPeMeJeQmLKFogU": {
		name: "Jito Staked SOL",
		symbol: "JitoSOL",
		image: oklinkSplIcon("J1tSo1ZHTdN76rbsrGCkTF4EYK4mzPeMeJeQmLKFogU"),
	},
	// Widespread memes (canonical mints on mainnet)
	"DezXAZ8z7PnrnRJjz3wXBoRgixCa6xjnB7YaB1pPB263": {
		name: "Bonk",
		symbol: "Bonk",
		image: oklinkSplIcon("DezXAZ8z7PnrnRJjz3wXBoRgixCa6xjnB7YaB1pPB263"),
	},
	"EKpQGSJtjMFqKZ1KQanSqYXRcF8fBopzLHYxdM65zcjm": {
		name: "dogwifhat",
		symbol: "WIF",
		image: oklinkSplIcon("EKpQGSJtjMFqKZ1KQanSqYXRcF8fBopzLHYxdM65zcjm"),
	},
	// Oracles, infra, governance
	"HZ1JovNiVvGrGNiiYvEozEVgZ58xaU3RKwX8eACQBCt3": {
		name: "Pyth Network",
		symbol: "PYTH",
		image: oklinkSplIcon("HZ1JovNiVvGrGNiiYvEozEVgZ58xaU3RKwX8eACQBCt3"),
	},
	"jtojtomepa8beP8AuQc6eXt5FriJwfFMwQx2v2f9mCL": {
		name: "Jito",
		symbol: "JTO",
		image: oklinkSplIcon("jtojtomepa8beP8AuQc6eXt5FriJwfFMwQx2v2f9mCL"),
	},
	"hntyVP6YFm1Hg25TN9WGLqM12b8TQmcknKrdu1oxWux": {
		name: "Helium Network Token",
		symbol: "HNT",
		image: oklinkSplIcon("hntyVP6YFm1Hg25TN9WGLqM12b8TQmcknKrdu1oxWux"),
	},
	// Classic DeFi (token-list)
	"7dHbWXmci3dT8UFYWYZweBLXgycu7Y3iL6trKn1Y7ARj": {
		name: "Lido Staked SOL",
		symbol: "stSOL",
		image: oklinkSplIcon("7dHbWXmci3dT8UFYWYZweBLXgycu7Y3iL6trKn1Y7ARj"),
	},
	"SRMuApVNdxXokk5GT7XD5cUUgXMBCoAz2LHeuAoKWRt": {
		name: "Serum",
		symbol: "SRM",
		image: oklinkSplIcon("SRMuApVNdxXokk5GT7XD5cUUgXMBCoAz2LHeuAoKWRt"),
	},
	"MangoCzJ36AjZyKwVj3VnYU4GTonjfVEnJmvvWaxLac": {
		name: "Mango",
		symbol: "MNGO",
		image: oklinkSplIcon("MangoCzJ36AjZyKwVj3VnYU4GTonjfVEnJmvvWaxLac"),
	},
	"8HGyAAB1yoM1ttS7pXjHMa3dukTFGQggnFFH3hJZgzQh": {
		name: "COPE",
		symbol: "COPE",
		image: oklinkSplIcon("8HGyAAB1yoM1ttS7pXjHMa3dukTFGQggnFFH3hJZgzQh"),
	},
	"StepAscQoEioFxxWGnh2sLBDFp9d8rvKz2Yp39iDpyT": {
		name: "Step",
		symbol: "STEP",
		image: oklinkSplIcon("StepAscQoEioFxxWGnh2sLBDFp9d8rvKz2Yp39iDpyT"),
	},
	"4dmKkXNHdgYsXqBHCuMikNQWwVomZURhYvkkX5c4pQ7y": {
		name: "Synthetify",
		symbol: "SNY",
		image: oklinkSplIcon("4dmKkXNHdgYsXqBHCuMikNQWwVomZURhYvkkX5c4pQ7y"),
	},
	"EchesyfXePKdLtoiZSL8pBe8Myagyy8ZRqsACNCFGnvp": {
		name: "Bonfida",
		symbol: "FIDA",
		image: oklinkSplIcon("EchesyfXePKdLtoiZSL8pBe8Myagyy8ZRqsACNCFGnvp"),
	},
	"kinXdEcpDQeHPEuQnqmUgtYykqKGVFq6CeVX5iAHJq6": {
		name: "KIN",
		symbol: "KIN",
		image: oklinkSplIcon("kinXdEcpDQeHPEuQnqmUgtYykqKGVFq6CeVX5iAHJq6"),
	},
	"z3dn17yLaGMKffVogeFHQ9zWVcXgqgf3PQnDsNs2g6M": {
		name: "Oxygen",
		symbol: "OXY",
		image: oklinkSplIcon("z3dn17yLaGMKffVogeFHQ9zWVcXgqgf3PQnDsNs2g6M"),
	},
	"MAPS41MDahZ9QdKXhVa4dWB9RuyfV4XqhyAZ8XcYepb": {
		name: "MAPS",
		symbol: "MAPS",
		image: oklinkSplIcon("MAPS41MDahZ9QdKXhVa4dWB9RuyfV4XqhyAZ8XcYepb"),
	},
	"xxxxa1sKNGwFtw2kFn8XauW9xq8hBZ5kVtcSesTT9fW": {
		name: "Solanium",
		symbol: "SLIM",
		image: oklinkSplIcon("xxxxa1sKNGwFtw2kFn8XauW9xq8hBZ5kVtcSesTT9fW"),
	},
	"TuLipcqtGVXP9XR62wM8WWCm6a9vhLs7T1uoWBk6FDs": {
		name: "Tulip",
		symbol: "TULIP",
		image: oklinkSplIcon("TuLipcqtGVXP9XR62wM8WWCm6a9vhLs7T1uoWBk6FDs"),
	},
	"4wjPQJ6PrkC4dHhYghwJzGBVP78DkBzA2U3kHoFNBuhj": {
		name: "LIQ",
		symbol: "LIQ",
		image: oklinkSplIcon("4wjPQJ6PrkC4dHhYghwJzGBVP78DkBzA2U3kHoFNBuhj"),
	},
	"PoRTjZMPXb9T7dyU7tpLEZRQj7e6ssfAE62j2oQuc6y": {
		name: "Port",
		symbol: "PORT",
		image: oklinkSplIcon("PoRTjZMPXb9T7dyU7tpLEZRQj7e6ssfAE62j2oQuc6y"),
	},
	"ETAtLmCmsoiEEKfNrHKJ2kYy3MoABhU6NQvpSfij5tDs": {
		name: "Media Network",
		symbol: "MEDIA",
		image: oklinkSplIcon("ETAtLmCmsoiEEKfNrHKJ2kYy3MoABhU6NQvpSfij5tDs"),
	},
	"SUNNYWgPQmFxe9wTZzNK7iPnJ3vYDrkgnxJRJm1s3ag": {
		name: "Sunny",
		symbol: "SUNNY",
		image: oklinkSplIcon("SUNNYWgPQmFxe9wTZzNK7iPnJ3vYDrkgnxJRJm1s3ag"),
	},
	"Saber2gLauYim4Mvftnrasomsv6NvAuncvMEZwcLpD1": {
		name: "Saber",
		symbol: "SBR",
		image: oklinkSplIcon("Saber2gLauYim4Mvftnrasomsv6NvAuncvMEZwcLpD1"),
	},
	"SLRSSpSLUTP7okbCUBYStWCo1vUgyt775faPqz8HUMr": {
		name: "Solrise",
		symbol: "SLRS",
		image: oklinkSplIcon("SLRSSpSLUTP7okbCUBYStWCo1vUgyt775faPqz8HUMr"),
	},
	"8PMHT4swUMtBzgHnh5U564N5sjPSiUz2cjEQzFnnP1Fo": {
		name: "Rope",
		symbol: "ROPE",
		image: oklinkSplIcon("8PMHT4swUMtBzgHnh5U564N5sjPSiUz2cjEQzFnnP1Fo"),
	},
	"MERt85fc5boKw3BW1eYdxonEuJNvXbiMbs6hvheau5K": {
		name: "Mercurial",
		symbol: "MER",
		image: oklinkSplIcon("MERt85fc5boKw3BW1eYdxonEuJNvXbiMbs6hvheau5K"),
	},
	"FJtaAZd6tXNCFGTq7ifRHt9AWoVdads6gWNc4SXCPw1k": {
		name: "Aleph im",
		symbol: "ALEPH",
		image: oklinkSplIcon("FJtaAZd6tXNCFGTq7ifRHt9AWoVdads6gWNc4SXCPw1k"),
	},
	"HxhWkVpk5NS4Ltg5nij2G671CKXFRKPK8vy271Ub4uEK": {
		name: "Hxro",
		symbol: "HXRO",
		image: oklinkSplIcon("HxhWkVpk5NS4Ltg5nij2G671CKXFRKPK8vy271Ub4uEK"),
	},
	"9LzCMqDgTKYz9Drzqnpgee3SGa89up3a247ypMj2xrqM": {
		name: "Audius",
		symbol: "AUDIO",
		image: oklinkSplIcon("9LzCMqDgTKYz9Drzqnpgee3SGa89up3a247ypMj2xrqM"),
	},
	"7i5KKsX2weiTkry7jA4ZwSuXGhs5eJBEjY8vVxR4pfRx": {
		name: "GMT",
		symbol: "GMT",
		image: oklinkSplIcon("7i5KKsX2weiTkry7jA4ZwSuXGhs5eJBEjY8vVxR4pfRx"),
	},
	"7xKXtg2CW87d97TXJSDpbD5jBkheTqA83TZRuJosgAsU": {
		name: "Samoyed",
		symbol: "SAMO",
		image: oklinkSplIcon("7xKXtg2CW87d97TXJSDpbD5jBkheTqA83TZRuJosgAsU"),
	},
	"6o4f6tuvVQTa9PTrHN9pvUeXEPusN6RLgMam1Zc7tYbm": {
		name: "Wen",
		symbol: "WEN",
		image: oklinkSplIcon("6o4f6tuvVQTa9PTrHN9pvUeXEPusN6RLgMam1Zc7tYbm"),
	},
	"7Q2afV64in6N6SeZsAAB81TJzwDoD6zpqmHkzi9Dcavn": {
		name: "JPool",
		symbol: "JSOL",
		image: oklinkSplIcon("7Q2afV64in6N6SeZsAAB81TJzwDoD6zpqmHkzi9Dcavn"),
	},
	"5oVNBeEEQvYi1cX3ir8Dx5n1P7pdxydbGF2X4TxVusJm": {
		name: "Socean staked SOL",
		symbol: "scnSOL",
		image: oklinkSplIcon("5oVNBeEEQvYi1cX3ir8Dx5n1P7pdxydbGF2X4TxVusJm"),
	},
};

/**
 * Resolve display metadata for known SPL mints when on-chain RPC only returns balances.
 * Source A (Trust Wallet RPC) does not include name/symbol/logo, so without this overlay
 * every SPL appears as a generic "SPL <mint>" row in `/api/solana/address/:id`.
 *
 * @param {string} mint
 * @returns {{ name: string, symbol: string, image: string } | null}
 */
const getKnownSplDisplay = (mint) => {
	if (!mint) return null;

	if (mint === WSOL_MINT) return WSOL_DISPLAY;

	const znsMint = config.solana?.tokenMintAddress || ZNS_MAINNET_MINT;
	if (mint === znsMint) return ZNS_DISPLAY;

	return STATIC_POPULAR_SPL_BY_MINT[mint] || null;
};

module.exports = {
	getKnownSplDisplay,
	ZNS_MAINNET_MINT,
	WSOL_MINT,
	STATIC_POPULAR_SPL_BY_MINT,
	oklinkSplIcon,
};
