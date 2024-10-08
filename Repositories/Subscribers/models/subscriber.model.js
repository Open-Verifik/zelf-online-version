const mongoose = require("mongoose");

const Schema = mongoose.Schema;

const { ObjectId, String, Boolean } = mongoose.Schema.Types;

const { requiredEnumField, requiredField, refField, defaultField, addBasicPlugins } = require("../../../Core/mongoose-utils");

//####################################################//

const SubscriberSchema = new Schema({
	email: requiredField(String),
	sentWelcomeEmail: defaultField(Boolean, false),
	name: defaultField(String), // optional
	lists: [
		{
			type: String,
		},
	],
});

SubscriberSchema.pre("save", async (next) => {
	const _this = this;
});

SubscriberSchema.post("save", async (next) => {
	const _this = this;
});

/**
 * #model methods
 */
SubscriberSchema.methods = {};

addBasicPlugins(SubscriberSchema);

const Subscriber = mongoose.model("Subscriber", SubscriberSchema);

module.exports = Subscriber;
