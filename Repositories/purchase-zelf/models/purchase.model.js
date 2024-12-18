const mongoose = require("mongoose");

const Schema = mongoose.Schema;

const { ObjectId, String } = mongoose.Schema.Types;

const { addBasicPlugins } = require("../../../Core/mongoose-utils");

//####################################################//

const purchaseSchema = new Schema({
	crypto: {
		type: String,
		required: true,
		minlength: 2,
	},
	amountToSend: {
		type: String,
		required: true,
		minlength: 2,
	},
	amountDetected: {
		type: String,
		required: true,
		minlength: 4,
	},
	ratePriceInTUSD: {
		type: String,
		required: true,
	},
	address: {
		type: String,
		required: true,
	},
});

purchaseSchema.pre("save", async (next) => {
	const _this = this;
});

purchaseSchema.post("save", async (next) => {
	const _this = this;
});

/**
 * #model methods
 */
purchaseSchema.methods = {};

addBasicPlugins(purchaseSchema);

module.exports = mongoose.model("purchase", purchaseSchema);
