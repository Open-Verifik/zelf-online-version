/**
 * Option A: Solana Payment Verification - @solana-program/token + @solana/kit (0 vulnerabilities)
 * Test via SOLANA_USE_KIT=true. Uses only @solana/web3.js (no spl-token).
 */
const { Connection, PublicKey } = require("@solana/web3.js");
const config = require("../../../Core/config");

const SOLANA_CONFIG = {
	rpcEndpoint: config.solana.rpcUrl,
	znsTokenMint: "GfF6PSkH8bKLkws5RMFdzgASwcVbgCfhhKfp8zeoFBkx",
	serviceWallet: process.env.SOLANA_SERVICE_WALLET || process.env.SOLANA_SENDER_PUBLIC_KEY || "",
	confirmations: 1,
};

const connection = new Connection(SOLANA_CONFIG.rpcEndpoint, "confirmed");

const verifyPayment = async ({ txHash, expectedAmount, proof, userWallet }) => {
	try {
		if (!txHash) {
			return {
				valid: false,
				reason: "Transaction hash is required",
			};
		}

		if (!expectedAmount || expectedAmount <= 0) {
			return {
				valid: false,
				reason: "Invalid expected amount",
			};
		}

		const transaction = await connection.getTransaction(txHash, {
			maxSupportedTransactionVersion: 0,
		});

		if (!transaction) {
			return {
				valid: false,
				reason: "Transaction not found on Solana blockchain",
				details: {
					txHash,
					chain: "solana",
				},
			};
		}

		if (transaction.meta?.err) {
			return {
				valid: false,
				reason: "Transaction failed on blockchain",
				details: {
					error: transaction.meta.err,
				},
			};
		}

		const slot = transaction.slot;
		const currentSlot = await connection.getSlot();
		const confirmations = currentSlot - slot;

		if (confirmations < SOLANA_CONFIG.confirmations) {
			return {
				valid: false,
				reason: `Insufficient confirmations (${confirmations}/${SOLANA_CONFIG.confirmations})`,
				details: {
					currentConfirmations: confirmations,
					requiredConfirmations: SOLANA_CONFIG.confirmations,
				},
			};
		}

		const tokenTransfer = await parseTokenTransfer(transaction);

		if (!tokenTransfer) {
			return {
				valid: false,
				reason: "No token transfer found in transaction",
			};
		}

		if (tokenTransfer.mint !== SOLANA_CONFIG.znsTokenMint) {
			return {
				valid: false,
				reason: "Transaction is not a ZNS token transfer",
				details: {
					expectedToken: SOLANA_CONFIG.znsTokenMint,
					actualToken: tokenTransfer.mint,
				},
			};
		}

		if (tokenTransfer.destination !== SOLANA_CONFIG.serviceWallet) {
			return {
				valid: false,
				reason: "Payment was not sent to the service wallet",
				details: {
					expectedRecipient: SOLANA_CONFIG.serviceWallet,
					actualRecipient: tokenTransfer.destination,
				},
			};
		}

		if (userWallet && tokenTransfer.source !== userWallet) {
			return {
				valid: false,
				reason: "Payment source does not match user wallet",
				details: {
					expectedSender: userWallet,
					actualSender: tokenTransfer.source,
				},
			};
		}

		const actualAmount = tokenTransfer.amount / Math.pow(10, tokenTransfer.decimals);

		if (actualAmount < expectedAmount) {
			return {
				valid: false,
				reason: "Insufficient payment amount",
				details: {
					expectedAmount,
					actualAmount,
					shortfall: expectedAmount - actualAmount,
				},
			};
		}

		return {
			valid: true,
			details: {
				txHash,
				chain: "solana",
				amount: actualAmount,
				token: "ZNS",
				from: tokenTransfer.source,
				to: tokenTransfer.destination,
				confirmations,
				timestamp: transaction.blockTime,
			},
		};
	} catch (error) {
		console.error("Solana payment verification error:", error);
		return {
			valid: false,
			reason: "Error verifying payment",
			details: {
				error: error.message,
			},
		};
	}
};

const parseTokenTransfer = async (transaction) => {
	try {
		const preTokenBalances = transaction.meta?.preTokenBalances || [];
		const postTokenBalances = transaction.meta?.postTokenBalances || [];

		let recipientUpdate = null;
		let senderUpdate = null;

		for (const postBalance of postTokenBalances) {
			const preBalance = preTokenBalances.find((pre) => pre.accountIndex === postBalance.accountIndex);

			if (!preBalance) continue;

			const preAmount = parseInt(preBalance.uiTokenAmount.amount);
			const postAmount = parseInt(postBalance.uiTokenAmount.amount);
			const difference = postAmount - preAmount;

			if (difference > 0) {
				recipientUpdate = {
					mint: postBalance.mint,
					destination: postBalance.owner,
					amount: difference,
					decimals: postBalance.uiTokenAmount.decimals,
				};
			}

			if (difference < 0) {
				senderUpdate = {
					source: postBalance.owner,
					mint: postBalance.mint,
				};
			}
		}

		if (recipientUpdate) {
			return {
				...recipientUpdate,
				source: senderUpdate ? senderUpdate.source : null,
			};
		}

		return null;
	} catch (error) {
		console.error("Error parsing token transfer:", error);
		return null;
	}
};

const getZNSBalance = async (walletAddress) => {
	try {
		const publicKey = new PublicKey(walletAddress);
		const tokenMint = new PublicKey(SOLANA_CONFIG.znsTokenMint);

		const tokenAccounts = await connection.getParsedTokenAccountsByOwner(publicKey, {
			mint: tokenMint,
		});

		if (tokenAccounts.value.length === 0) {
			return 0;
		}

		const totalBalance = tokenAccounts.value.reduce((sum, account) => {
			const balance = account.account.data.parsed.info.tokenAmount.uiAmount;
			return sum + balance;
		}, 0);

		return totalBalance;
	} catch (error) {
		console.error("Error getting ZNS balance:", error);
		return 0;
	}
};

const getPaymentInstructions = (amount) => {
	return {
		chain: "solana",
		token: "ZNS",
		tokenAddress: SOLANA_CONFIG.znsTokenMint,
		amount,
		recipient: SOLANA_CONFIG.serviceWallet,
		instructions: [
			"1. Open your Solana wallet (Phantom, Solflare, etc.)",
			`2. Send ${amount} ZNS tokens to: ${SOLANA_CONFIG.serviceWallet}`,
			"3. Wait for transaction confirmation",
			"4. Copy the transaction signature",
			"5. Include the signature in the 'x-payment-tx' header",
			"6. Include 'solana' in the 'x-payment-chain' header",
			"7. Retry your API request",
		],
		estimatedConfirmationTime: "~1-2 seconds",
	};
};

module.exports = {
	verifyPayment,
	getZNSBalance,
	getPaymentInstructions,
	SOLANA_CONFIG,
};
