const mongoose = require("mongoose");

const Schema = mongoose.Schema;

const { ObjectId, String, Boolean } = mongoose.Schema.Types;

const { requiredEnumField, requiredField, refField, defaultField, addBasicPlugins } = require("../../../Core/mongoose-utils");

//####################################################//

const WalletSchema = new Schema({
	client: refField(ObjectId, "Client"),
	anonymous: defaultField(Boolean, true),
	zelfProof: requiredField(String),
	image: defaultField(String, ""),
	publicData: { type: Schema.Types.Mixed },
	zkProof: requiredField(String),
	ethAddress: defaultField(String),
	solanaAddress: defaultField(String),
	hasPassword: defaultField(Boolean, false),
});

WalletSchema.pre("save", async (next) => {
	const _this = this;
});

WalletSchema.post("save", async (next) => {
	const _this = this;
});

/**
 * #model methods
 */
WalletSchema.methods = {};

addBasicPlugins(WalletSchema);

const Wallet = mongoose.model("Wallet", WalletSchema);

module.exports = Wallet;
