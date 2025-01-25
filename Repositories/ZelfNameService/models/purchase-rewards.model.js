const mongoose = require("mongoose");

const Schema = mongoose.Schema;

const { ObjectId, String } = mongoose.Schema.Types;

const { requiredEnumField, requiredField, refField, defaultField, addBasicPlugins } = require("../../../Core/mongoose-utils");

//####################################################//

const PurchaseRewardSchema = new Schema({
	zelfName: {
		type: String,
		required: true,
		unique: true,
	},
	ethAddress: {
		type: String,
		required: true,
		unique: true,
	},
	solanaAddress: {
		type: String,
		required: true,
		unique: true,
	},
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
PurchaseRewardSchema.index({ zelfName: 1, referralZelfName: 1 }, { unique: true });

PurchaseRewardSchema.pre("save", async (next) => {
	const _this = this;
});

PurchaseRewardSchema.post("save", async (next) => {
	const _this = this;
});

/**
 * #model methods
 */
PurchaseRewardSchema.methods = {};

addBasicPlugins(PurchaseRewardSchema);

const PurchaseReward = mongoose.model("PurchaseReward", PurchaseRewardSchema);

module.exports = PurchaseReward;
