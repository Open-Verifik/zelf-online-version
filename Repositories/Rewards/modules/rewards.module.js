const IPFS = require("../../../Core/ipfs");
const ZNSSearchModule = require("../../ZelfNameService/modules/zns-search.module");
const ZNSTokenModule = require("../../ZelfNameService/modules/zns-token.module");
const NotificationService = require("../services/notification.service");
const Model = require("../models/rewards.model"); // MongoDB model for TTL cache
const moment = require("moment");
const ZNSTransactionDetector = require("../../ZelfNameService/modules/zns-transaction-detector.module");

const get = async (params = {}, authUser = {}) => {
	try {
		// Check for composite key optimization first
		const zelfName = params.zelfName || params.userId;
		if (zelfName && params.rewardDate) {
			const rewardPrimaryKey = `${zelfName}${params.rewardDate}`;
			return await IPFS.filter("rewardPrimaryKey", rewardPrimaryKey);
		}

		// Build filters object from params
		const filters = {};

		if (zelfName) filters.zelfName = zelfName;
		if (params.type) filters.rewardType = params.type;
		if (params.rewardDate) filters.rewardDate = params.rewardDate;
		if (params.zelfNameType) filters.zelfNameType = params.zelfNameType;

		// If multiple filters, use multi-key filtering
		if (Object.keys(filters).length > 1) {
			return await _filterByMultipleKeys(filters);
		}

		// Single filter - use direct IPFS filter
		if (zelfName) {
			return await IPFS.filter("zelfName", zelfName);
		}

		if (params.type) {
			return await IPFS.filter("rewardType", params.type);
		}

		if (params.rewardDate) {
			return await IPFS.filter("rewardDate", params.rewardDate);
		}

		// Return empty array if no specific filter
		return [];
	} catch (error) {
		console.error("Error getting rewards from IPFS:", error);
		return [];
	}
};

const show = async (params = {}, authUser = {}) => {
	try {
		// Get specific reward by CID
		if (params.cid) {
			return await IPFS.retrieve(params.cid);
		}

		// If ID is provided, try to find it
		if (params.id) {
			return await IPFS.filter("rewardId", params.id);
		}

		return null;
	} catch (error) {
		console.error("Error showing reward from IPFS:", error);
		return null;
	}
};

const create = async (data, authUser) => {
	// For now, just return the request data
	return {
		message: "Reward creation endpoint",
		requestData: data,
		authUser: authUser,
	};
};

const update = async (data, authUser) => {
	// For now, just return the request data
	return {
		message: "Reward update endpoint",
		requestData: data,
		authUser: authUser,
	};
};

const destroy = async (data, authUser) => {
	// For now, just return the request data
	return {
		message: "Reward deletion endpoint",
		requestData: data,
		authUser: authUser,
	};
};

// Helper function to determine ZelfName type
const _getZelfNamePublicData = async (zelfName) => {
	try {
		const searchResult = await ZNSSearchModule.searchZelfName({ key: "zelfName", value: zelfName }, {});

		const zelfNameObject = searchResult.arweave.length ? searchResult.arweave[0] : searchResult.ipfs[0];

		if (!zelfNameObject?.publicData) throw new Error("ZelfName not found");

		return zelfNameObject.publicData;
	} catch (error) {
		throw new Error(`Failed to verify ZelfName: ${error.message}`);
	}
};

// Helper function to generate wheel reward based on type
const _generateWheelReward = (type) => {
	let min, max;

	if (type === "hold") {
		min = 0.1;
		max = 1.0;
	} else if (type === "mainnet") {
		min = 0.2;
		max = 2.0;
	} else {
		throw new Error("Invalid ZelfName type");
	}

	// Generate random reward amount within range (2 decimal places)
	const reward = Math.random() * (max - min) + min;
	return Math.round(reward * 100) / 100;
};

// Helper function to filter IPFS files by multiple metadata keys
const _filterByMultipleKeys = async (filters) => {
	try {
		// Start with the first filter to get initial results
		const firstKey = Object.keys(filters)[0];
		let results = await IPFS.filter(firstKey, filters[firstKey]);

		// Apply additional filters by checking metadata
		for (const [key, value] of Object.entries(filters)) {
			if (key === firstKey) continue; // Skip first key as it's already applied

			results = results.filter((file) => file.metadata && file.metadata[key] === value);
		}

		return results;
	} catch (error) {
		console.error("Error filtering by multiple keys:", error);
		return [];
	}
};

// Helper function to check if user already claimed today
const _getTodayReward = async (zelfName) => {
	try {
		// Create composite key for direct lookup
		const todayKey = moment().format("YYYY-MM-DD");
		const rewardPrimaryKey = `${zelfName}${todayKey}`;

		// Step 1: Check MongoDB first (TTL cache for first 5 minutes)
		const mongoReward = await Model.findOne({ rewardPrimaryKey });
		if (mongoReward) {
			console.log("Found reward in MongoDB cache");
			return {
				...mongoReward.toObject(),
				source: "mongodb",
				metadata: { rewardPrimaryKey },
			};
		}

		// Step 2: If not in MongoDB, check IPFS (after 5 minutes)
		console.log("Checking IPFS for reward...");
		const ipfsRewards = await IPFS.filter("rewardPrimaryKey", rewardPrimaryKey);

		if (ipfsRewards && ipfsRewards[0]) {
			console.log("Found reward in IPFS");
			return {
				...ipfsRewards[0],
				source: "ipfs",
			};
		}

		return null;
	} catch (error) {
		console.error("Error checking today's reward:", error);
		return null;
	}
};

const dailyRewards = async (data, authUser) => {
	try {
		const { zelfName } = data;

		if (!zelfName) throw new Error("ZelfName is required");

		// Get ZelfName type to determine reward range
		const zelfNamePublicData = await _getZelfNamePublicData(zelfName);

		// Validate that user has a Solana address for token transfer
		if (!zelfNamePublicData.solanaAddress) {
			throw new Error("No Solana address found for this ZelfName. Please update your ZelfName with a Solana address to receive rewards.");
		}

		// Check if user already claimed today
		const todayReward = await _getTodayReward(zelfName);

		if (todayReward) {
			return {
				success: false,
				reward: todayReward,
				message: "You have already claimed your daily reward today. Come back tomorrow!",
				nextClaimAvailable: moment().add(1, "day").startOf("day").toISOString(),
			};
		}

		// Generate wheel reward based on type
		const rewardAmount = _generateWheelReward(zelfNamePublicData.type);

		const todayKey = moment().format("YYYY-MM-DD");
		const rewardPrimaryKey = `${zelfName}${todayKey}`;
		// Create reward data
		const rewardData = {
			name: zelfName,
			rewardPrimaryKey,
			amount: rewardAmount,
			type: "daily",
			status: "claimed",
			description: `Daily wheel reward for ${zelfNamePublicData.type} ZelfName`,
			claimedAt: new Date().toISOString(),
			zelfNameType: zelfNamePublicData.type,
			wheelSpin: true,
			rewardRange: zelfNamePublicData.type === "hold" ? "0.1-1.0" : "0.2-2.0",
		};

		// Metadata for IPFS querying (key-value pairs)
		const metadata = {
			name: zelfName,
			rewardPrimaryKey, // Composite key for direct lookup
			rewardType: "daily",
			rewardDate: todayKey, // Date without time for easy querying
			zelfNameType: zelfNamePublicData.type,
			amount: rewardAmount.toString(),
			redeemedAt: moment().format("YYYY-MM-DD HH:mm:ss"), // Exact timestamp when redeemed
		};

		// Store reward as JSON in IPFS
		const rewardJson = JSON.stringify(rewardData);
		const base64Json = Buffer.from(rewardJson).toString("base64");
		const filename = `daily-reward-${rewardPrimaryKey}.json`;

		// Step 1: Save to MongoDB with TTL (5 minutes) for immediate availability
		const mongoReward = new Model({
			name: zelfName,
			rewardPrimaryKey,
			amount: rewardAmount,
			type: "daily",
			status: "claimed",
			description: `Daily wheel reward for ${zelfNamePublicData.type} ZelfName`,
			claimedAt: new Date(),
			zelfNameType: zelfNamePublicData.type,
			metadata: {
				wheelSpin: true,
				rewardRange: zelfNamePublicData.type === "hold" ? "0.1-1.0" : "0.2-2.0",
			},
		});

		await mongoReward.save();

		// Step 2: Save to IPFS for permanent storage (async, non-blocking)
		const ipfsResult = await IPFS.pinFile(`data:application/json;base64,${base64Json}`, filename, "application/json", metadata);

		if (ipfsResult) {
			// Update MongoDB record with IPFS CID
			mongoReward.ipfsCid = ipfsResult.IpfsHash;
			await mongoReward.save();
		}

		// Trigger notification
		await _sendRewardNotification(zelfName, rewardAmount, "claimed");

		// Step 3: Send ZNS tokens to user's Solana address
		let tokenTransferResult = null;
		let tokenTransferError = null;

		try {
			console.log(`Sending ${rewardAmount} ZNS tokens to ${zelfNamePublicData.solanaAddress} for ${zelfName}`);
			const transferSignature = await ZNSTokenModule.giveTokensAfterPurchase(rewardAmount, zelfNamePublicData.solanaAddress);

			tokenTransferResult = {
				success: true,
				signature: transferSignature,
				amount: rewardAmount,
				recipientAddress: zelfNamePublicData.solanaAddress,
			};

			// Update reward status to include token transfer success
			rewardData.tokenTransfer = tokenTransferResult;
			mongoReward.tokenTransfer = tokenTransferResult;
			await mongoReward.save();

			console.log(`Successfully sent ZNS tokens. Transaction signature: ${transferSignature}`);
		} catch (tokenError) {
			console.error("Failed to send ZNS tokens:", tokenError);

			tokenTransferError = {
				success: false,
				error: tokenError.message,
				amount: rewardAmount,
				recipientAddress: zelfNamePublicData.solanaAddress,
			};

			// Update reward status to include token transfer failure
			rewardData.tokenTransfer = tokenTransferError;
			mongoReward.tokenTransfer = tokenTransferError;
			mongoReward.tokenTransferStatus = "failed";
			await mongoReward.save();

			// Don't throw error here, user still gets the reward record
			// The token transfer can be retried later if needed
		}

		return {
			success: true,
			message: "Congratulations! You've spun the wheel and won your daily reward!",
			reward: {
				rewardPrimaryKey,
				amount: rewardAmount,
				currency: "ZNS",
				type: "daily",
				zelfNameType: zelfNamePublicData.type,
				claimedAt: rewardData.claimedAt,
				nextClaimAvailable: moment().add(1, "day").startOf("day").toISOString(),
				ipfsCid: ipfsResult?.IpfsHash || null,
				mongoId: mongoReward._id,
				tokenTransfer: tokenTransferResult || tokenTransferError,
				storage: {
					mongodb: "immediate (5min TTL)",
					ipfs: ipfsResult ? "stored" : "failed",
				},
			},
			tokenTransferStatus: tokenTransferResult ? "success" : "failed",
			tokenTransferMessage: tokenTransferResult
				? `${rewardAmount} ZNS tokens have been sent to your Solana address!`
				: `Reward claimed but token transfer failed. Please contact support with error: ${tokenTransferError?.error}`,
		};
	} catch (error) {
		console.error("Error in dailyRewards:", error);
		throw new Error(error.message || "Failed to process daily reward");
	}
};

// Notification system placeholder functions
const _sendRewardNotification = async (zelfName, amount, status) => {
	// TODO: Implement notification system
	console.log(`Notification: ${zelfName} ${status} ${amount} ZNS reward`);
};

const _sendDailyReminderNotification = async (zelfName) => {
	// TODO: Implement daily reminder notification
	console.log(`Reminder: ${zelfName} can claim daily reward`);
};

const _sendWeeklyRewardSummary = async (zelfName, weeklyTotal) => {
	// TODO: Implement weekly summary notification
	console.log(`Weekly Summary: ${zelfName} earned ${weeklyTotal} ZNS this week`);
};

// Function to check and send reminder notifications (for cron job)
const checkAndSendReminders = async () => {
	// TODO: Implement logic to find users who haven't claimed today
	// and send them reminder notifications
	console.log("Checking for users to send reminder notifications...");
};

// Get user's reward history
const getUserRewardHistory = async (zelfName, limit = 10) => {
	try {
		// Get all rewards for this user from IPFS
		const ipfsFiles = await IPFS.filter("zelfName", zelfName);

		// Parse and sort rewards by date
		const rewards = [];
		let totalEarned = 0;

		for (const file of ipfsFiles) {
			try {
				// Retrieve the actual reward data
				const rewardFile = await IPFS.retrieve(file.ipfs_pin_hash);

				if (rewardFile && rewardFile.url) {
					// Fetch the JSON content
					const response = await fetch(rewardFile.url);
					const rewardData = await response.json();

					rewards.push({
						...rewardData,
						ipfsCid: file.ipfs_pin_hash,
						metadata: file.metadata,
					});

					if (rewardData.status === "claimed") {
						totalEarned += rewardData.amount || 0;
					}
				}
			} catch (parseError) {
				console.error("Error parsing reward file:", parseError);
			}
		}

		// Sort by claimedAt date (newest first) and limit
		const sortedRewards = rewards.sort((a, b) => new Date(b.claimedAt) - new Date(a.claimedAt)).slice(0, limit);

		return {
			rewards: sortedRewards,
			totalEarned,
			rewardsCount: rewards.length,
		};
	} catch (error) {
		throw new Error(`Failed to get reward history: ${error.message}`);
	}
};

// Get user's reward statistics
const getUserRewardStats = async (zelfName) => {
	try {
		const now = moment();
		const startOfWeek = moment().startOf("week").toDate();
		const startOfMonth = moment().startOf("month").toDate();

		const [dailyStreak, weeklyTotal, monthlyTotal, canClaimToday] = await Promise.all([
			_calculateDailyStreak(zelfName),
			_getTotalRewardsInPeriod(zelfName, startOfWeek),
			_getTotalRewardsInPeriod(zelfName, startOfMonth),
			_hasClaimedToday(zelfName),
		]);

		return {
			dailyStreak,
			weeklyTotal,
			monthlyTotal,
			canClaimToday: !canClaimToday,
			nextClaimAvailable: canClaimToday ? moment().add(1, "day").startOf("day").toISOString() : moment().toISOString(),
		};
	} catch (error) {
		throw new Error(`Failed to get reward stats: ${error.message}`);
	}
};

// Helper function to calculate daily streak
const _calculateDailyStreak = async (zelfName) => {
	try {
		// Get all daily rewards for this user
		const ipfsFiles = await IPFS.filter("zelfName", zelfName);
		const dailyRewards = [];

		// Filter for daily rewards and parse dates
		for (const file of ipfsFiles) {
			if (file.metadata && file.metadata.rewardType === "daily") {
				dailyRewards.push({
					date: moment(file.metadata.rewardDate, "YYYY-MM-DD"),
					metadata: file.metadata,
				});
			}
		}

		if (dailyRewards.length === 0) return 0;

		// Sort by date (newest first)
		dailyRewards.sort((a, b) => b.date.valueOf() - a.date.valueOf());

		let streak = 0;
		let currentDate = moment().startOf("day");

		for (const reward of dailyRewards) {
			if (reward.date.isSame(currentDate)) {
				streak++;
				currentDate.subtract(1, "day");
			} else if (reward.date.isSame(currentDate.subtract(1, "day"))) {
				streak++;
				currentDate.subtract(1, "day");
			} else {
				break;
			}
		}

		return streak;
	} catch (error) {
		console.error("Error calculating streak:", error);
		return 0;
	}
};

// Helper function to get total rewards in a period
const _getTotalRewardsInPeriod = async (zelfName, startDate) => {
	try {
		// Get all rewards for this user
		const ipfsFiles = await IPFS.filter("zelfName", zelfName);
		let total = 0;

		const startMoment = moment(startDate);

		for (const file of ipfsFiles) {
			if (file.metadata && file.metadata.rewardDate) {
				const rewardDate = moment(file.metadata.rewardDate, "YYYY-MM-DD");

				// Check if reward is within the period
				if (rewardDate.isSameOrAfter(startMoment)) {
					const amount = parseFloat(file.metadata.amount) || 0;
					total += amount;
				}
			}
		}

		return total;
	} catch (error) {
		console.error("Error calculating period total:", error);
		return 0;
	}
};

const rewardFirstTransaction = async (data, authUser) => {
	try {
		const { zelfName } = data;

		if (!zelfName) {
			throw new Error("ZelfName is required");
		}

		console.log(`🎁 Checking first transaction reward for ${zelfName}`);

		// Get ZelfName public data to find Solana address
		const zelfNamePublicData = await _getZelfNamePublicData(zelfName);
		if (!zelfNamePublicData) throw new Error(`ZelfName ${zelfName} not found`);

		if (!zelfNamePublicData.solanaAddress) throw new Error(`No Solana address found for ${zelfName}`);

		// Check if user has already received first transaction reward
		const existingReward = await IPFS.filter("first_zns_transaction", zelfName);
		const hasFirstTransactionReward = existingReward.length > 0;

		if (hasFirstTransactionReward) {
			return {
				success: false,
				message: "First transaction reward already claimed",
				rewardType: "first_transaction",
				alreadyClaimed: true,
			};
		}

		// Check if user has sent ZNS tokens (indicating they've used the token)
		const sentTokenCheck = await ZNSTransactionDetector.hasSentZNSTokens(
			zelfNamePublicData.solanaAddress,
			{ hours: 24 * 365, minAmount: 0.001 } // Check last year, any amount
		);

		if (!sentTokenCheck.hasSent) {
			return {
				success: false,
				message: "No ZNS token transactions found. Make your first ZNS transaction to earn this reward!",
				rewardType: "first_transaction",
				eligible: false,
				requirements: {
					action: "Send ZNS tokens",
					description: "Make your first ZNS token transaction to unlock this reward",
				},
			};
		}

		// User is eligible for first transaction reward
		const rewardAmount = 1.0; // 1 ZNS for first transaction
		const rewardType = "first_transaction";
		const rewardDate = moment().format("YYYY-MM-DD");

		// Create reward data
		const rewardData = {
			zelfName,
			amount: rewardAmount,
			rewardType,
			rewardDate,
			description: "First ZNS Transaction Reward",
			requirements: {
				action: "Sent ZNS tokens",
				transactionCount: sentTokenCheck.transactionCount,
				totalAmountSent: sentTokenCheck.totalAmountSent,
				lastTransaction: sentTokenCheck.lastTransaction?.signature,
			},
			timestamp: new Date().toISOString(),
		};

		// Save to IPFS with specific filter key for first ZNS transaction
		const rewardJson = JSON.stringify(rewardData);
		const base64Json = Buffer.from(rewardJson).toString("base64");
		const filename = `first-zns-transaction-${zelfName}.json`;

		// Metadata for IPFS querying with specific filter key
		const metadata = {
			first_zns_transaction: zelfName, // Specific filter key for easy searching
			zelfName: zelfName,
			rewardType: "first_transaction",
			rewardDate: rewardDate,
			amount: rewardAmount.toString(),
			description: "First ZNS Transaction Reward",
		};

		const ipfsResult = await IPFS.pinFile(`data:application/json;base64,${base64Json}`, filename, "application/json", metadata);
		rewardData.ipfsHash = ipfsResult.IpfsHash;

		// Save to MongoDB
		const Reward = require("../models/rewards.model");
		const mongoReward = new Reward({
			name: zelfName,
			rewardPrimaryKey: `first_transaction_${zelfName}`,
			amount: rewardAmount,
			type: "achievement", // Using achievement type for first transaction
			status: "claimed",
			description: "First ZNS Transaction Reward",
			claimedAt: new Date(),
			zelfNameType: zelfNamePublicData.type || "hold", // Get from public data
			ipfsCid: ipfsResult.IpfsHash,
			metadata: rewardData,
		});

		await mongoReward.save();

		// Send ZNS tokens to user
		let tokenTransferResult = null;
		let tokenTransferError = null;

		try {
			console.log(`🎁 Sending ${rewardAmount} ZNS tokens for first transaction to ${zelfNamePublicData.solanaAddress}`);

			const ZNSTokenModule = require("../../ZelfNameService/modules/zns-token.module");
			const transferSignature = await ZNSTokenModule.giveTokensAfterPurchase(rewardAmount, zelfNamePublicData.solanaAddress);

			tokenTransferResult = {
				success: true,
				signature: transferSignature,
				amount: rewardAmount,
				recipientAddress: zelfNamePublicData.solanaAddress,
			};

			rewardData.tokenTransfer = tokenTransferResult;
			mongoReward.tokenTransfer = tokenTransferResult;
			mongoReward.status = "completed";
			await mongoReward.save();

			console.log(`✅ First transaction reward sent! Transaction signature: ${transferSignature}`);
		} catch (tokenError) {
			console.error("❌ Failed to send first transaction reward:", tokenError);
			tokenTransferError = {
				success: false,
				error: tokenError.message,
				amount: rewardAmount,
				recipientAddress: zelfNamePublicData.solanaAddress,
			};

			rewardData.tokenTransfer = tokenTransferError;
			mongoReward.tokenTransfer = tokenTransferError;
			mongoReward.status = "failed";
			await mongoReward.save();
		}

		// Send notification
		await _sendRewardNotification(zelfName, rewardAmount, tokenTransferResult ? "success" : "failed");

		return {
			success: true,
			message: "First transaction reward claimed successfully!",
			reward: {
				amount: rewardAmount,
				rewardType,
				zelfName,
				description: "First ZNS Transaction Reward",
				requirements: rewardData.requirements,
			},
			tokenTransfer: tokenTransferResult || tokenTransferError,
			tokenTransferStatus: tokenTransferResult ? "success" : "failed",
			ipfsHash: ipfsResult.hash,
			timestamp: rewardData.timestamp,
		};
	} catch (error) {
		console.error("❌ Error in rewardFirstTransaction:", error);
		throw new Error(`Failed to process first transaction reward: ${error.message}`);
	}
};

module.exports = {
	get,
	show,
	create,
	update,
	destroy,
	dailyRewards,
	rewardFirstTransaction,
	checkAndSendReminders,
	getUserRewardHistory,
	getUserRewardStats,
};
