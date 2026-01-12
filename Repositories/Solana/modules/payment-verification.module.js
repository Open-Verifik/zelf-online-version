const { Connection, PublicKey } = require("@solana/web3.js");
const config = require("../../../Core/config");

/**
 * Solana Payment Verification Module
 * Verifies ZNS token payments on Solana blockchain
 *
 * ZNS Token Address: GfF6PSkH8bKLkws5RMFdzgASwcVbgCfhhKfp8zeoFBkx
 */

// Solana configuration
const SOLANA_CONFIG = {
	rpcEndpoint: process.env.SOLANA_RPC_URL || process.env.SOLANA_RPC_ENDPOINT || "https://api.mainnet-beta.solana.com",
	znsTokenMint: "GfF6PSkH8bKLkws5RMFdzgASwcVbgCfhhKfp8zeoFBkx",
	serviceWallet: process.env.SOLANA_SERVICE_WALLET || process.env.SOLANA_SENDER_PUBLIC_KEY || "", // Your service wallet address
	confirmations: 1, // Number of confirmations required
};

// Initialize Solana connection
const connection = new Connection(SOLANA_CONFIG.rpcEndpoint, "confirmed");

/**
 * Verify a payment transaction on Solana
 * @param {Object} params - Payment verification parameters
 * @param {string} params.txHash - Transaction signature/hash
 * @param {number} params.expectedAmount - Expected payment amount in ZNS tokens
 * @param {string} params.proof - Payment proof (optional additional verification)
 * @param {string} params.userWallet - User's wallet address
 * @returns {Object} Verification result
 */
const verifyPayment = async ({ txHash, expectedAmount, proof, userWallet }) => {
	try {
		// Validate inputs
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

		// Fetch transaction details
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

		// Check transaction status
		if (transaction.meta?.err) {
			return {
				valid: false,
				reason: "Transaction failed on blockchain",
				details: {
					error: transaction.meta.err,
				},
			};
		}

		// Verify transaction is confirmed
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

		// Parse transaction to find token transfer
		const tokenTransfer = await parseTokenTransfer(transaction);

		if (!tokenTransfer) {
			return {
				valid: false,
				reason: "No token transfer found in transaction",
			};
		}

		// Verify it's a ZNS token transfer
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

		// Verify recipient is the service wallet
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

		// Verify sender matches user wallet (if provided)
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

		// Verify amount (convert from lamports to tokens)
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

/**
 * Parse token transfer from transaction
 * @param {Object} transaction - Solana transaction object
 * @returns {Object|null} Token transfer details or null
 */
const parseTokenTransfer = async (transaction) => {
	try {
		// Look for SPL Token transfer in transaction
		const preTokenBalances = transaction.meta?.preTokenBalances || [];
		const postTokenBalances = transaction.meta?.postTokenBalances || [];

		let recipientUpdate = null;
		let senderUpdate = null;

		// Find the token transfer by comparing pre and post balances
		for (const postBalance of postTokenBalances) {
			const preBalance = preTokenBalances.find((pre) => pre.accountIndex === postBalance.accountIndex);

			if (!preBalance) continue;

			const preAmount = parseInt(preBalance.uiTokenAmount.amount);
			const postAmount = parseInt(postBalance.uiTokenAmount.amount);
			const difference = postAmount - preAmount;

			// If there's a positive difference, this account received tokens
			if (difference > 0) {
				recipientUpdate = {
					mint: postBalance.mint,
					destination: postBalance.owner,
					amount: difference,
					decimals: postBalance.uiTokenAmount.decimals,
				};
			}

			// If there's a negative difference, this account sent tokens
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

/**
 * Get ZNS token balance for a wallet
 * @param {string} walletAddress - Wallet address to check
 * @returns {number} Token balance
 */
const getZNSBalance = async (walletAddress) => {
	try {
		const publicKey = new PublicKey(walletAddress);
		const tokenMint = new PublicKey(SOLANA_CONFIG.znsTokenMint);

		// Get token accounts for this wallet
		const tokenAccounts = await connection.getParsedTokenAccountsByOwner(publicKey, {
			mint: tokenMint,
		});

		if (tokenAccounts.value.length === 0) {
			return 0;
		}

		// Sum up all token account balances
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

/**
 * Generate payment instructions for users
 * @param {number} amount - Amount of ZNS tokens required
 * @returns {Object} Payment instructions
 */
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
