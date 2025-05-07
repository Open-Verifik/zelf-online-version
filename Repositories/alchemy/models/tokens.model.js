const mongoose = require("mongoose");

const Schema = mongoose.Schema;

const { addBasicPlugins } = require("../../../Core/mongoose-utils");

const tokensSchema = new Schema({
	tokenContractAddress: String,
	network: String,
	name: String,
	symbol: String,
	tokenType: String,
	logo: String,
	decimals: Number,
});

tokensSchema.pre("save", async function (next) {
	next();
});

tokensSchema.post("save", async function (doc, next) {
	next();
});

tokensSchema.methods.updateTokens = async function (newData) {
	Object.assign(this.crypto, newData);
	return this.save();
};

addBasicPlugins(tokensSchema);

module.exports = mongoose.model("tokens", tokensSchema);
