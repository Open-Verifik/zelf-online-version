const mongoose = require("mongoose");

const Schema = mongoose.Schema;

const { ObjectId, String } = mongoose.Schema.Types;

const { requiredEnumField, requiredField, refField, defaultField, addBasicPlugins } = require("../../../Core/mongoose-utils");

//####################################################//

const PGPKeySchema = new Schema({
	identifier: {
		type: String,
		required: true,
		unique: true,
	},
	type: requiredEnumField(String, ["session", "storage"]),
	key: requiredField(String),
	name: requiredField(String),
	email: requiredField(String),
	publicKey: requiredField(String),
});

PGPKeySchema.pre("save", async (next) => {
	const _this = this;
});

PGPKeySchema.post("save", async (next) => {
	const _this = this;
});

/**
 * #model methods
 */
PGPKeySchema.methods = {};

addBasicPlugins(PGPKeySchema);

const PGPKey = mongoose.model("PGPKey", PGPKeySchema);

module.exports = PGPKey;
