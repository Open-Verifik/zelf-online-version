const mongoose = require("mongoose");

const Schema = mongoose.Schema;

const { ObjectId, String } = mongoose.Schema.Types;

const { addBasicPlugins } = require("../../../Core/mongoose-utils");
const { boolean } = require("joi");

//####################################################//

const purchaseSchema = new Schema(
	{
		zelfName: { type: String },
		duration: { type: String },
		crypto: {
			type: String,
		},
		cryptoValue: { type: String },
		ratePriceInUSDT: { type: String },
		wordsCount: { type: String },
		USD: { type: String },
		amountToSend: {
			type: String,
		},
		amountDetected: {
			type: String,
		},
		paymentAddress: String,
		address: {},
		transactionStatus: String,
		transactionDescription: String,
		coinbase_hosted_url: String,
		remainingTime: String,
		lastSavedTime: String,
	},
	{
		timestamps: false,
	}
);

purchaseSchema.pre("save", async function (next) {
	next();
});

purchaseSchema.post("save", async function (doc, next) {
	next();
});

purchaseSchema.index({ purchaseCreatedAt: 1 }, { expireAfterSeconds: 7200 });

purchaseSchema.methods = {};

addBasicPlugins(purchaseSchema);

module.exports = mongoose.model("purchase", purchaseSchema);
