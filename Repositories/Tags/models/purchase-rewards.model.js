const mongoose = require("mongoose");

const Schema = mongoose.Schema;

const { ObjectId, String } = mongoose.Schema.Types;

const { requiredEnumField, requiredField, refField, defaultField, addBasicPlugins } = require("../../../Core/mongoose-utils");
const { token } = require("../../../Core/config");

//####################################################//

const PurchaseRewardSchema = new Schema({
	tagName: {
		type: String,
		required: true,
		unique: true,
	},
	domain: requiredField(String),
	ethAddress: {
		type: String,
		required: true,
	},
	solanaAddress: {
		type: String,
		required: true,
	},
	status: requiredEnumField(String, ["pending", "completed", "failed"], "pending"),
	attempts: requiredField(Number),
	ipfsHash: requiredField(String),
	arweaveId: requiredField(String),
	tagPrice: requiredField(Number),
	tokenAmount: requiredField(Number),
	payload: {
		type: Object,
		default: {},
	},
	completedAt: {
		type: Date,
		default: Date.now,
	},
});

// Add a unique compound index for tagName and domain
PurchaseRewardSchema.index({ tagName: 1, domain: 1 }, { unique: true });

// Add index for domain-based queries
PurchaseRewardSchema.index({ domain: 1, status: 1 });

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

module.exports = mongoose.model("TagsPurchaseReward", PurchaseRewardSchema);
