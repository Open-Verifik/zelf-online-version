const mongoose = require("mongoose");

const Schema = mongoose.Schema;

const { addBasicPlugins } = require("../../../Core/mongoose-utils");

//####################################################//

const cryptoSchema = new Schema({
	crypto: {},
});

cryptoSchema.pre("save", async function (next) {
	next();
});

cryptoSchema.post("save", async function (doc, next) {
	next();
});

cryptoSchema.methods.updateCrypto = async function (newData) {
	Object.assign(this.crypto, newData);
	return this.save();
};

addBasicPlugins(cryptoSchema);

module.exports = mongoose.model("crypto", cryptoSchema);
