const mongoose = require("mongoose");

const rewardsSchema = new mongoose.Schema(
	{
		rewardPrimaryKey: {
			type: String,
			required: true,
			unique: true,
			index: true,
		},
		name: {
			type: String,
			required: true,
			index: true,
		},
		amount: {
			type: Number,
			required: true,
		},
		type: {
			type: String,
			required: true,
			enum: ["daily", "referral", "bonus", "achievement"],
		},
		status: {
			type: String,
			default: "claimed",
			enum: ["pending", "claimed", "expired"],
		},
		description: {
			type: String,
			optional: true,
		},
		claimedAt: {
			type: Date,
			required: true,
			default: Date.now,
		},
		zelfNameType: {
			type: String,
			required: true,
			enum: ["hold", "mainnet"],
		},
		ipfsCid: {
			type: String,
			optional: true,
		},
		metadata: {
			type: mongoose.Schema.Types.Mixed,
			optional: true,
		},
		// TTL field - documents will be automatically deleted after 5 minutes
		expiresAt: {
			type: Date,
			default: Date.now,
			expires: 300, // 5 minutes in seconds
		},
	},
	{
		timestamps: true,
	}
);

// Indexes
rewardsSchema.index({ rewardPrimaryKey: 1 }, { unique: true });
rewardsSchema.index({ zelfName: 1, type: 1 });
rewardsSchema.index({ zelfName: 1, status: 1 });
rewardsSchema.index({ createdAt: -1 });
rewardsSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 }); // TTL index

module.exports = mongoose.model("Rewards", rewardsSchema);
