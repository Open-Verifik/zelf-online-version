/**
 * Option A: ZNS Transaction Detector - @solana-program/token + @solana/kit (0 vulnerabilities)
 * Test via SOLANA_USE_KIT=true. For now uses same manual SPL as Option B.
 */
const solanaWeb3 = require("@solana/web3.js");
const splManual = require("../../../Core/spl-token-manual");
const config = require("../../../Core/config");
const moment = require("moment");

const connection = new solanaWeb3.Connection(config.solana.rpcUrl, "confirmed");
const ZNS_TOKEN_MINT = new solanaWeb3.PublicKey(config.solana.tokenMintAddress);

const detectZNSTransactions = async (solanaAddress, options = {}) => {
	try {
		const { limit = 20, before = null, includeFailed = false } = options;

		console.log(`🔍 Detecting ZNS transactions for address: ${solanaAddress}`);

		const associatedTokenAddress = splManual.getAssociatedTokenAddress(new solanaWeb3.PublicKey(solanaAddress), ZNS_TOKEN_MINT);

		const signatures = await connection.getSignaturesForAddress(associatedTokenAddress, { limit, before });

		const transactions = [];

		for (const sigInfo of signatures) {
			try {
				const transaction = await connection.getTransaction(sigInfo.signature, {
					maxSupportedTransactionVersion: 0,
				});

				if (!transaction || !transaction.meta) continue;

				if (!includeFailed && transaction.meta.err) continue;

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
						fee: transaction.meta.fee / 1e9,
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

const extractZNSTransfers = (transaction, targetAddress) => {
	const transfers = [];

	if (!transaction.meta || !transaction.meta.postTokenBalances || !transaction.meta.preTokenBalances) {
		return transfers;
	}

	const preBalances = new Map();
	const postBalances = new Map();

	for (const balance of transaction.meta.preTokenBalances) {
		if (balance.mint === ZNS_TOKEN_MINT.toString()) {
			preBalances.set(balance.owner, {
				amount: parseInt(balance.uiTokenAmount.amount),
				decimals: balance.uiTokenAmount.decimals,
			});
		}
	}

	for (const balance of transaction.meta.postTokenBalances) {
		if (balance.mint === ZNS_TOKEN_MINT.toString()) {
			postBalances.set(balance.owner, {
				amount: parseInt(balance.uiTokenAmount.amount),
				decimals: balance.uiTokenAmount.decimals,
			});
		}
	}

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
				change: change / Math.pow(10, preBalance.decimals),
				changeRaw: change,
				type: change > 0 ? "received" : "sent",
				preBalance: preBalance.amount / Math.pow(10, preBalance.decimals),
				postBalance: postBalance.amount / Math.pow(10, preBalance.decimals),
			});
		}
	}

	return transfers;
};

const getZNSBalance = async (solanaAddress) => {
	try {
		const associatedTokenAddress = splManual.getAssociatedTokenAddress(new solanaWeb3.PublicKey(solanaAddress), ZNS_TOKEN_MINT);

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

const startZNSMonitoring = (addresses, callback) => {
	console.log(`🚀 Starting ZNS transaction monitoring for ${addresses.length} addresses`);

	let isMonitoring = true;
	const lastChecked = new Map();

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

					lastChecked.set(address, Date.now() / 1000);

					await callback(address, newTransactions);
				}
			} catch (error) {
				console.error(`❌ Error monitoring ${address}:`, error.message);
			}
		}
	};

	const interval = setInterval(checkForNewTransactions, 30000);

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
