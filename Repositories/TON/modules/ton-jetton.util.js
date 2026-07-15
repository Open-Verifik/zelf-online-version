const { tonApiGet } = require("./ton-api.client");

/** USDT Jetton master on TON mainnet (Tether). */
const USDT_JETTON_MASTER = "EQCxE6mUtQJKFnGfaROTKOt1lZbDiiX1kCixRv7Nw2Id_sDs";

const NANOTON_PER_TON = 1_000_000_000n;

const nanotonToTonString = (nanoton) => {
	if (nanoton === undefined || nanoton === null) return "0";
	const value = typeof nanoton === "bigint" ? nanoton : BigInt(String(nanoton).split(".")[0] || "0");
	const whole = value / NANOTON_PER_TON;
	const frac = value % NANOTON_PER_TON;
	if (frac === 0n) return whole.toString();
	const fracStr = frac.toString().padStart(9, "0").replace(/0+$/, "");
	return `${whole.toString()}.${fracStr}`;
};

const jettonAmountToString = (amount, decimals = 9) => {
	if (amount === undefined || amount === null) return "0";
	const value = BigInt(String(amount).split(".")[0] || "0");
	const base = 10n ** BigInt(decimals);
	const whole = value / base;
	const frac = value % base;
	if (frac === 0n) return whole.toString();
	const fracStr = frac.toString().padStart(Number(decimals), "0").replace(/0+$/, "");
	return `${whole.toString()}.${fracStr}`;
};

/**
 * Resolve a user's jetton wallet address for a given Jetton master via TonAPI.
 */
const resolveJettonWalletAddress = async (ownerAddress, jettonMaster) => {
	const owner = encodeURIComponent(String(ownerAddress || "").trim());
	const jetton = encodeURIComponent(String(jettonMaster || "").trim());
	const data = await tonApiGet(`/jettons/${jetton}/wallets/${owner}`);
	const wallet = data?.address || data?.wallet_address?.address;
	if (!wallet) {
		const err = new Error("jetton_wallet_not_found");
		err.status = 404;
		throw err;
	}
	return typeof wallet === "string" ? wallet : wallet.address || wallet;
};

module.exports = {
	USDT_JETTON_MASTER,
	NANOTON_PER_TON,
	nanotonToTonString,
	jettonAmountToString,
	resolveJettonWalletAddress,
};
