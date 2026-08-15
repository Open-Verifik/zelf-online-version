const SolanaPaymentService = require("../../Solana/modules/payment-verification.module");
const AvalanchePaymentService = require("../../Avalanche/modules/payment-verification.module");
const BasePaymentService = require("../../base/modules/payment-verification.module");
const IPFSModule = require("../../IPFS/modules/ipfs.module");

const CHAINS = ["solana", "avalanche", "base"];

const PAYMENT_CONFIG = {
	"/api/face-certificates/generate": {
		cost: 0.1,
		chains: CHAINS,
		description: "Face Certificate generate",
	},
	"/api/face-certificates/verify": {
		cost: 0.01,
		chains: CHAINS,
		description: "Face Certificate verify",
	},
	"/api/face-certificates/encrypt": {
		cost: 0.1,
		chains: CHAINS,
		description: "Face Certificate encrypt",
	},
	"/api/face-certificates/decrypt": {
		cost: 0.05,
		chains: CHAINS,
		description: "Face Certificate decrypt",
	},
	"/api/face-certificates/sign": {
		cost: 0.05,
		chains: CHAINS,
		description: "Face Certificate sign",
	},
	"/api/face-certificates/public-key": {
		cost: 0.01,
		chains: CHAINS,
		description: "Face Certificate public key",
	},
	"/api/face-certificates/verify-signature": {
		cost: 0.01,
		chains: CHAINS,
		description: "Face Certificate verify signature",
	},
	"/api/face-certificates/verify-signature-with-public-key": {
		cost: 0.01,
		chains: CHAINS,
		description: "Face Certificate verify signature with public key",
	},
};

const PAYMENT_SERVICES = {
	solana: SolanaPaymentService,
	avalanche: AvalanchePaymentService,
	base: BasePaymentService,
};

const paymentRequired = async (ctx, next) => {
	try {
		const endpoint = ctx.path;
		const paymentConfig = PAYMENT_CONFIG[endpoint];

		if (!paymentConfig) {
			return await next();
		}

		if (await hasValidSubscription(ctx)) {
			return await next();
		}

		const paymentProof = ctx.headers["x-payment-proof"];
		const paymentChain = ctx.headers["x-payment-chain"]?.toLowerCase();
		const paymentTxHash = ctx.headers["x-payment-tx"];

		if (!paymentProof || !paymentChain || !paymentTxHash) {
			ctx.status = 402;
			ctx.body = {
				error: "Payment Required",
				message: "This endpoint requires payment to access",
				paymentDetails: {
					cost: paymentConfig.cost,
					token: "ZNS",
					acceptedChains: paymentConfig.chains,
					description: paymentConfig.description,
				},
				instructions: {
					step1: "Send the required amount of ZNS tokens to the service wallet",
					step2: "Include the transaction hash in the 'x-payment-tx' header",
					step3: "Include the chain name in the 'x-payment-chain' header (solana, avalanche, or base)",
					step4: "Include the payment proof in the 'x-payment-proof' header",
				},
			};
			return;
		}

		if (!paymentConfig.chains.includes(paymentChain)) {
			ctx.status = 400;
			ctx.body = {
				error: "Invalid Payment Chain",
				message: `Chain '${paymentChain}' is not supported for this endpoint`,
				acceptedChains: paymentConfig.chains,
			};
			return;
		}

		const PaymentService = PAYMENT_SERVICES[paymentChain];

		if (!PaymentService) {
			ctx.status = 500;
			ctx.body = {
				error: "Payment Service Unavailable",
				message: `Payment verification service for '${paymentChain}' is not available`,
			};
			return;
		}

		const verificationResult = await PaymentService.verifyPayment({
			txHash: paymentTxHash,
			expectedAmount: paymentConfig.cost,
			proof: paymentProof,
			userWallet: ctx.state.user?.walletAddress || ctx.headers["x-wallet-address"],
		});

		if (!verificationResult.valid) {
			ctx.status = 402;
			ctx.body = {
				error: "Payment Verification Failed",
				message: verificationResult.reason || "Payment could not be verified",
				details: verificationResult.details,
			};
			return;
		}

		if (await isPaymentUsed(paymentTxHash)) {
			ctx.status = 409;
			ctx.body = {
				error: "Payment Already Used",
				message: "This payment has already been used for a previous request",
			};
			return;
		}

		await markPaymentAsUsed({
			txHash: paymentTxHash,
			chain: paymentChain,
			amount: paymentConfig.cost,
			endpoint,
			userId: ctx.state.user?.id,
			timestamp: new Date(),
		});

		ctx.state.paymentInfo = {
			chain: paymentChain,
			amount: paymentConfig.cost,
			txHash: paymentTxHash,
			verified: true,
		};

		await next();
	} catch (error) {
		console.error("Payment verification error:", error);
		ctx.status = 500;
		ctx.body = {
			error: "Payment Verification Error",
			message: "An error occurred while verifying payment",
			details: error.message,
		};
	}
};

const hasValidSubscription = async (ctx) => {
	try {
		const userId = ctx.state.user?.id;
		if (!userId) return false;
		const subscription = await getSubscriptionStatus(userId);
		return subscription && subscription.active && subscription.plan !== "free";
	} catch (error) {
		console.error("Subscription check error:", error);
		return false;
	}
};

const isPaymentUsed = async (txHash) => {
	try {
		const payment = await findPaymentByTxHash(txHash);
		return payment !== null;
	} catch (error) {
		console.error("Payment check error:", error);
		return true;
	}
};

const markPaymentAsUsed = async (paymentData) => {
	try {
		await savePaymentRecord(paymentData);
	} catch (error) {
		console.error("Error marking payment as used:", error);
		throw error;
	}
};

const getSubscriptionStatus = async () => null;

const findPaymentByTxHash = async (txHash) => {
	try {
		const results = await IPFSModule.get({ key: "paymentTx", value: txHash });
		if (results && results.length > 0) {
			return results[0];
		}
		return null;
	} catch (error) {
		console.error("Error finding payment in IPFS:", error);
		return null;
	}
};

const savePaymentRecord = async (paymentData) => {
	const receipt = {
		...paymentData,
		type: "ZELF_PAYMENT_RECEIPT",
		version: "1.0",
		timestamp: new Date().toISOString(),
	};

	const base64 = Buffer.from(JSON.stringify(receipt)).toString("base64");

	const result = await IPFSModule.insert(
		{
			base64,
			name: `PaymentReceipt_${paymentData.txHash}`,
			pinIt: true,
			metadata: {
				paymentTx: `${paymentData.txHash}`,
				chain: `${paymentData.chain}`,
				amount: `${paymentData.amount}`,
				type: "ZELF_PAYMENT",
			},
		},
		{ pro: true }
	);

	if (!result) {
		throw new Error("Failed to save payment record to IPFS (Insert returned null)");
	}

	return result;
};

const getPaymentStats = async (ctx) => {
	try {
		const userId = ctx.state.user?.id;

		if (!userId) {
			ctx.status = 401;
			ctx.body = { error: "Unauthorized" };
			return;
		}

		ctx.status = 200;
		ctx.body = {
			success: true,
			stats: {
				totalPaid: 0,
				transactionCount: 0,
				chainBreakdown: {
					solana: 0,
					avalanche: 0,
					base: 0,
				},
			},
		};
	} catch (error) {
		console.error("Error fetching payment stats:", error);
		ctx.status = 500;
		ctx.body = {
			error: "Failed to fetch payment statistics",
			message: error.message,
		};
	}
};

module.exports = {
	paymentRequired,
	getPaymentStats,
	PAYMENT_CONFIG,
};
