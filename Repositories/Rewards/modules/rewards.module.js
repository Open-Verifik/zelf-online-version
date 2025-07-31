const IPFS = require("../../../Core/ipfs");
const ZNSSearchModule = require("../../ZelfNameService/modules/zns-search.module");
const NotificationService = require("../services/notification.service");
const Model = require("../models/rewards.model"); // MongoDB model for TTL cache
const moment = require("moment");

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
			rewardPrimaryKey,
			zelfName: zelfName,
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
			rewardPrimaryKey, // Composite key for direct lookup
			zelfName: zelfName,
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
			rewardPrimaryKey,
			zelfName,
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
		console.log("Reward saved to MongoDB cache");

		// Step 2: Save to IPFS for permanent storage (async, non-blocking)
		const ipfsResult = await IPFS.pinFile(`data:application/json;base64,${base64Json}`, filename, "application/json", metadata);

		if (ipfsResult) {
			// Update MongoDB record with IPFS CID
			mongoReward.ipfsCid = ipfsResult.IpfsHash;
			await mongoReward.save();
			console.log("Reward saved to IPFS with CID:", ipfsResult.IpfsHash);
		} else {
			console.error("Failed to store reward in IPFS, but MongoDB cache is active");
		}

		// Trigger notification
		await _sendRewardNotification(zelfName, rewardAmount, "claimed");

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
				storage: {
					mongodb: "immediate (5min TTL)",
					ipfs: ipfsResult ? "stored" : "failed",
				},
			},
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

module.exports = {
	get,
	show,
	create,
	update,
	destroy,
	dailyRewards,
	checkAndSendReminders,
	getUserRewardHistory,
	getUserRewardStats,
};
