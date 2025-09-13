const mongoose = require("mongoose");

const Schema = mongoose.Schema;

const { ObjectId, String } = mongoose.Schema.Types;

const { requiredEnumField, requiredField, refField, defaultField, addBasicPlugins } = require("../../../Core/mongoose-utils");

//####################################################//

const ReferralRewardSchema = new Schema({
	tagName: requiredField(String),
	domain: requiredField(String),
	ethAddress: requiredField(String),
	solanaAddress: requiredField(String),
	referralTagName: requiredField(String),
	referralDomain: requiredField(String),
	status: requiredEnumField(String, ["pending", "completed", "failed"], "pending"),
	referralSolanaAddress: requiredField(String),
	attempts: requiredField(Number),
	ipfsHash: requiredField(String),
	arweaveId: requiredField(String),
	tagPrice: requiredField(Number),
	payload: {
		type: Object,
		default: {},
	},
	completedAt: {
		type: Date,
		default: Date.now,
	},
});

// Add a unique compound index for tagName and referralTagName
ReferralRewardSchema.index({ tagName: 1, referralTagName: 1 }, { unique: true });

// Add index for domain-based queries
ReferralRewardSchema.index({ domain: 1, status: 1 });

ReferralRewardSchema.pre("save", async (next) => {
	const _this = this;
});

ReferralRewardSchema.post("save", async (next) => {
	const _this = this;
});

/**
 * #model methods
 */
ReferralRewardSchema.methods = {};

addBasicPlugins(ReferralRewardSchema);

module.exports = mongoose.model("TagsReferralReward", ReferralRewardSchema);
