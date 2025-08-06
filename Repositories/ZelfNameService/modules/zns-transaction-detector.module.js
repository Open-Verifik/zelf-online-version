const solanaWeb3 = require("@solana/web3.js");
const splToken = require("@solana/spl-token");
const config = require("../../../Core/config");
const moment = require("moment");

// Initialize Solana connection
const connection = new solanaWeb3.Connection(`https://flashy-ultra-choice.solana-mainnet.quiknode.pro/${config.solana.nodeSecret}/`, "confirmed");

// ZNS Token mint address
const ZNS_TOKEN_MINT = new solanaWeb3.PublicKey(config.solana.tokenMintAddress);

/**
 * Detect ZNS token transactions for a specific address
 * @param {string} solanaAddress - The Solana address to monitor
 * @param {Object} options - Detection options
 * @param {number} options.limit - Number of transactions to fetch (default: 20)
 * @param {string} options.before - Signature to start from (for pagination)
 * @param {boolean} options.includeFailed - Include failed transactions (default: false)
 * @returns {Array} Array of ZNS token transactions
 */
const detectZNSTransactions = async (solanaAddress, options = {}) => {
	try {
		const { limit = 20, before = null, includeFailed = false } = options;

		console.log(`🔍 Detecting ZNS transactions for address: ${solanaAddress}`);

		// Get the associated token account for this address
		const associatedTokenAddress = await splToken.getAssociatedTokenAddress(ZNS_TOKEN_MINT, new solanaWeb3.PublicKey(solanaAddress));

		// Get transaction signatures for the token account
		const signatures = await connection.getSignaturesForAddress(associatedTokenAddress, { limit, before });

		const transactions = [];

		// Process each transaction signature
		for (const sigInfo of signatures) {
			try {
				const transaction = await connection.getTransaction(sigInfo.signature, {
					maxSupportedTransactionVersion: 0,
				});

				if (!transaction || !transaction.meta) continue;

				// Check if transaction was successful (unless includeFailed is true)
				if (!includeFailed && transaction.meta.err) continue;

				// Extract ZNS token transfers from the transaction
				const znsTransfers = extractZNSTransfers(transaction, solanaAddress);

				if (znsTransfers.length > 0) {
					transactions.push({
						signature: sigInfo.signature,
						blockTime: transaction.blockTime,
						date: moment.unix(transaction.blockTime).format("YYYY-MM-DD HH:mm:ss"),
						age: moment.unix(transaction.blockTime).fromNow(),
						status: transaction.meta.err ? "Failed" : "Success",
						transfers: znsTransfers,
						slot: transaction.slot,
						fee: transaction.meta.fee / 1e9, // Convert lamports to SOL
						rawTransaction: transaction,
					});
				}
			} catch (error) {
				console.warn(`⚠️ Error processing transaction ${sigInfo.signature}:`, error.message);
				continue;
			}
		}

		console.log(`✅ Found ${transactions.length} ZNS transactions for ${solanaAddress}`);
		return transactions;
	} catch (error) {
		console.error("❌ Error detecting ZNS transactions:", error);
		throw error;
	}
};

/**
 * Check if an address has sent ZNS tokens recently
 * @param {string} solanaAddress - The Solana address to check
 * @param {Object} options - Check options
 * @param {number} options.hours - Hours to look back (default: 24)
 * @param {number} options.minAmount - Minimum amount to consider (default: 0.01)
 * @returns {Object} Result with hasSent and transaction details
 */
const hasSentZNSTokens = async (solanaAddress, options = {}) => {
	try {
		const { hours = 24, minAmount = 0.01 } = options;

		console.log(`🔍 Checking if ${solanaAddress} has sent ZNS tokens in the last ${hours} hours`);

		const transactions = await detectZNSTransactions(solanaAddress, {
			limit: 50,
			includeFailed: false,
		});

		const cutoffTime = Date.now() / 1000 - hours * 3600;
		const recentTransactions = transactions.filter((tx) => tx.blockTime >= cutoffTime);

		const sentTransactions = recentTransactions.filter((tx) => {
			return tx.transfers.some((transfer) => transfer.isTargetAddress && transfer.type === "sent" && Math.abs(transfer.change) >= minAmount);
		});

		const totalSent = sentTransactions.reduce((total, tx) => {
			const sentAmount = tx.transfers.filter((t) => t.isTargetAddress && t.type === "sent").reduce((sum, t) => sum + Math.abs(t.change), 0);
			return total + sentAmount;
		}, 0);

		return {
			hasSent: sentTransactions.length > 0,
			transactionCount: sentTransactions.length,
			totalAmountSent: totalSent,
			lastTransaction: sentTransactions[0] || null,
			transactions: sentTransactions,
			timeRange: `${hours} hours`,
		};
	} catch (error) {
		console.error("❌ Error checking ZNS token sends:", error);
		throw error;
	}
};

/**
 * Extract ZNS token transfers from a transaction
 * @param {Object} transaction - Solana transaction object
 * @param {string} targetAddress - Address to filter transfers for
 * @returns {Array} Array of ZNS transfers
 */
const extractZNSTransfers = (transaction, targetAddress) => {
	const transfers = [];
	const targetPubkey = new solanaWeb3.PublicKey(targetAddress);

	if (!transaction.meta || !transaction.meta.postTokenBalances || !transaction.meta.preTokenBalances) {
		return transfers;
	}

	// Create maps for pre and post balances
	const preBalances = new Map();
	const postBalances = new Map();

	// Process pre-token balances
	for (const balance of transaction.meta.preTokenBalances) {
		if (balance.mint === ZNS_TOKEN_MINT.toString()) {
			preBalances.set(balance.owner, {
				amount: parseInt(balance.uiTokenAmount.amount),
				decimals: balance.uiTokenAmount.decimals,
			});
		}
	}

	// Process post-token balances
	for (const balance of transaction.meta.postTokenBalances) {
		if (balance.mint === ZNS_TOKEN_MINT.toString()) {
			postBalances.set(balance.owner, {
				amount: parseInt(balance.uiTokenAmount.amount),
				decimals: balance.uiTokenAmount.decimals,
			});
		}
	}

	// Calculate transfers
	const allOwners = new Set([...preBalances.keys(), ...postBalances.keys()]);

	for (const owner of allOwners) {
		const preBalance = preBalances.get(owner) || { amount: 0, decimals: 8 };
		const postBalance = postBalances.get(owner) || { amount: 0, decimals: 8 };

		const change = postBalance.amount - preBalance.amount;

		if (change !== 0) {
			const ownerAddress = owner;
			const isTargetAddress = ownerAddress === targetAddress;

			transfers.push({
				owner: ownerAddress,
				isTargetAddress,
				change: change / Math.pow(10, preBalance.decimals), // Convert to human readable
				changeRaw: change,
				type: change > 0 ? "received" : "sent",
				preBalance: preBalance.amount / Math.pow(10, preBalance.decimals),
				postBalance: postBalance.amount / Math.pow(10, preBalance.decimals),
			});
		}
	}

	return transfers;
};

/**
 * Get ZNS token balance for an address
 * @param {string} solanaAddress - The Solana address
 * @returns {Object} Balance information
 */
const getZNSBalance = async (solanaAddress) => {
	try {
		const associatedTokenAddress = await splToken.getAssociatedTokenAddress(ZNS_TOKEN_MINT, new solanaWeb3.PublicKey(solanaAddress));

		const tokenAccount = await connection.getTokenAccountBalance(associatedTokenAddress);

		if (!tokenAccount.value) {
			return {
				balance: 0,
				balanceRaw: 0,
				decimals: 8,
				hasAccount: false,
			};
		}

		return {
			balance: tokenAccount.value.uiAmount,
			balanceRaw: tokenAccount.value.amount,
			decimals: tokenAccount.value.decimals,
			hasAccount: true,
		};
	} catch (error) {
		console.error("❌ Error getting ZNS balance:", error);
		return {
			balance: 0,
			balanceRaw: 0,
			decimals: 8,
			hasAccount: false,
			error: error.message,
		};
	}
};

/**
 * Monitor ZNS transactions in real-time (for webhook or polling)
 * @param {Array} addresses - Array of addresses to monitor
 * @param {Function} callback - Callback function for new transactions
 * @returns {Object} Monitoring control object
 */
const startZNSMonitoring = (addresses, callback) => {
	console.log(`🚀 Starting ZNS transaction monitoring for ${addresses.length} addresses`);

	let isMonitoring = true;
	const lastChecked = new Map();

	// Initialize last checked times
	addresses.forEach((addr) => {
		lastChecked.set(addr, Date.now() / 1000);
	});

	const checkForNewTransactions = async () => {
		if (!isMonitoring) return;

		for (const address of addresses) {
			try {
				const lastCheck = lastChecked.get(address);
				const transactions = await detectZNSTransactions(address, { limit: 10 });

				const newTransactions = transactions.filter((tx) => tx.blockTime > lastCheck);

				if (newTransactions.length > 0) {
					console.log(`🆕 Found ${newTransactions.length} new ZNS transactions for ${address}`);

					// Update last checked time
					lastChecked.set(address, Date.now() / 1000);

					// Call callback with new transactions
					await callback(address, newTransactions);
				}
			} catch (error) {
				console.error(`❌ Error monitoring ${address}:`, error.message);
			}
		}
	};

	// Check every 30 seconds
	const interval = setInterval(checkForNewTransactions, 30000);

	// Initial check
	checkForNewTransactions();

	return {
		stop: () => {
			isMonitoring = false;
			clearInterval(interval);
			console.log("🛑 ZNS monitoring stopped");
		},
		addAddress: (address) => {
			addresses.push(address);
			lastChecked.set(address, Date.now() / 1000);
			console.log(`➕ Added ${address} to monitoring`);
		},
		removeAddress: (address) => {
			const index = addresses.indexOf(address);
			if (index > -1) {
				addresses.splice(index, 1);
				lastChecked.delete(address);
				console.log(`➖ Removed ${address} from monitoring`);
			}
		},
	};
};

module.exports = {
	detectZNSTransactions,
	hasSentZNSTokens,
	getZNSBalance,
	startZNSMonitoring,
	extractZNSTransfers,
};
