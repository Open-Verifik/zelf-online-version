const config = require("../../../Core/config");
const { tonApiGet } = require("./ton-api.client");
const { nanotonToTonString, jettonAmountToString, USDT_JETTON_MASTER } = require("./ton-jetton.util");

const getServiceWalletAddress = () => {
	const address = (config.ton?.serviceWalletAddress || "").trim();
	if (!address) {
		const error = new Error("503:ton_service_wallet_not_configured");
		error.status = 503;
		throw error;
	}
	return address;
};

const getServiceWallet = async () => ({
	success: true,
	serviceWallet: getServiceWalletAddress(),
	chain: "ton",
	nativeCurrency: "TON",
	acceptedJettons: [
		{
			symbol: "USDT",
			jettonMaster: config.ton?.usdtJettonMaster || USDT_JETTON_MASTER,
		},
	],
});

const normalizeAddress = (addr) => String(addr || "").trim().toLowerCase();

const verifyPaymentTransaction = async ({ txHash, expectedAmount, assetType = "TON", jettonMaster }) => {
	const hash = String(txHash || "").trim();
	if (!hash) {
		const error = new Error("400:missing_tx_hash");
		error.status = 400;
		throw error;
	}

	const serviceWallet = getServiceWalletAddress();
	const event = await tonApiGet(`/events/${encodeURIComponent(hash)}`);
	const actions = event.actions || [];

	for (const action of actions) {
		if (assetType === "TON" && action.type === "TonTransfer" && action.TonTransfer) {
			const transfer = action.TonTransfer;
			const recipient = transfer.recipient?.address || "";
			if (normalizeAddress(recipient) !== normalizeAddress(serviceWallet)) continue;
			const amountTon = nanotonToTonString(transfer.amount ?? 0);
			if (expectedAmount != null && Number(amountTon) < Number(expectedAmount) * 0.99) {
				const error = new Error("400:insufficient_payment_amount");
				error.status = 400;
				throw error;
			}
			return {
				verified: true,
				txHash: hash,
				amount: amountTon,
				asset: "TON",
				recipient,
			};
		}

		if (assetType === "JETTON" && action.type === "JettonTransfer" && action.JettonTransfer) {
			const transfer = action.JettonTransfer;
			const recipient = transfer.recipient?.address || "";
			const master = transfer.jetton?.address || "";
			const expectedMaster = jettonMaster || config.ton?.usdtJettonMaster || USDT_JETTON_MASTER;
			if (normalizeAddress(recipient) !== normalizeAddress(serviceWallet)) continue;
			if (normalizeAddress(master) !== normalizeAddress(expectedMaster)) continue;
			const decimals = transfer.jetton?.decimals ?? 6;
			const amount = jettonAmountToString(transfer.amount ?? 0, decimals);
			if (expectedAmount != null && Number(amount) < Number(expectedAmount) * 0.99) {
				const error = new Error("400:insufficient_payment_amount");
				error.status = 400;
				throw error;
			}
			return {
				verified: true,
				txHash: hash,
				amount,
				asset: transfer.jetton?.symbol || "JETTON",
				jettonMaster: master,
				recipient,
			};
		}
	}

	const error = new Error("404:payment_transaction_not_found");
	error.status = 404;
	throw error;
};

const confirmPayment = async (payload) => {
	const { txHash, amount, assetType, jettonMaster, paymentId } = payload;

	const verification = await verifyPaymentTransaction({
		txHash,
		expectedAmount: amount,
		assetType: assetType || "TON",
		jettonMaster,
	});

	return {
		success: true,
		paymentId: paymentId || null,
		verification,
		chain: "ton",
	};
};

module.exports = {
	getServiceWallet,
	confirmPayment,
	verifyPaymentTransaction,
};
