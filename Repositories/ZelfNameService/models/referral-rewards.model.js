const mongoose = require("mongoose");

const Schema = mongoose.Schema;

const { ObjectId, String } = mongoose.Schema.Types;

const { requiredEnumField, requiredField, refField, defaultField, addBasicPlugins } = require("../../../Core/mongoose-utils");

//####################################################//

const ReferralRewardSchema = new Schema({
	zelfName: requiredField(String),
	ethAddress: requiredField(String),
	referralZelfName: requiredField(String),
	status: requiredEnumField(String, ["pending", "completed", "failed"], "pending"),
	attempts: requiredField(Number),
	ipfsHash: requiredField(String),
	arweaveId: requiredField(String),
	zelfNamePrice: requiredField(Number),
	payload: {
		type: Object,
		default: {},
	},
	completedAt: {
		type: Date,
		default: Date.now,
	},
});

// Add a unique compound index for zelfName and referralZelfName
ReferralRewardSchema.index({ zelfName: 1, referralZelfName: 1 }, { unique: true });

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

const ReferralReward = mongoose.model("ReferralReward", ReferralRewardSchema);

module.exports = ReferralReward;
