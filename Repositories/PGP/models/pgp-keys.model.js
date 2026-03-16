const mongoose = require("mongoose");

const Schema = mongoose.Schema;

const { ObjectId, String } = mongoose.Schema.Types;

const { requiredEnumField, requiredField, refField, defaultField, addBasicPlugins } = require("../../../Core/mongoose-utils");

//####################################################//

const PGPKeySchema = new Schema({
	identifier: {
		type: String,
		required: true,
	},
	type: requiredEnumField(String, ["session", "storage"]),
	scopeType: {
		type: String,
		required: false,
	},
	scopeKey: {
		type: String,
		required: false,
	},
	key: requiredField(String),
	name: requiredField(String),
	email: requiredField(String),
	publicKey: requiredField(String),
	lastTimeUsed: defaultField(Date, Date.now),
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

// New writes namespace identifiers by type to avoid legacy collisions.
PGPKeySchema.index(
	{ type: 1, scopeKey: 1 },
	{
		unique: true,
		partialFilterExpression: {
			type: "storage",
			scopeKey: { $exists: true, $type: "string" },
		},
	}
);

addBasicPlugins(PGPKeySchema);

const PGPKey = mongoose.model("PGPKey", PGPKeySchema);

module.exports = PGPKey;
