const mongoose = require("mongoose");

const Schema = mongoose.Schema;

const { ObjectId, String } = mongoose.Schema.Types;

const { requiredEnumField, requiredField, refField, defaultField, addBasicPlugins } = require("../../../Core/mongoose-utils");

//####################################################//

const SessionSchema = new Schema({
	identifier: {
		type: String,
		required: true,
		unique: true,
	},
	status: requiredEnumField(String, ["active", "used"], "active"),
	type: requiredEnumField(String, ["createWallet", "decryptWallet", "importWallet", "general"], "createWallet"),
	activatedAt: {
		type: Date,
		expires: "1m",
		default: Date.now,
	},
	completedAt: {},
});

SessionSchema.pre("save", async (next) => {
	const _this = this;
});

SessionSchema.post("save", async (next) => {
	const _this = this;
});

/**
 * #model methods
 */
SessionSchema.methods = {};

addBasicPlugins(SessionSchema);

const Session = mongoose.model("Session", SessionSchema);

module.exports = Session;
