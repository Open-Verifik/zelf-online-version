const mongoose = require("mongoose");

const Schema = mongoose.Schema;

const { ObjectId, String, Boolean } = mongoose.Schema.Types;

const { requiredEnumField, requiredField, refField, defaultField, addBasicPlugins } = require("../../../Core/mongoose-utils");

//####################################################//

const SubscriberSchema = new Schema({
    email: requiredField(String),
    sentWelcomeEmail: defaultField(Boolean, false),
    name: { type: String, required: false }, // optional
    lists: [
        {
            type: String,
        },
    ],
    emailsReceived: [
        {
            articleId: { type: mongoose.Schema.Types.ObjectId, ref: "Article" },
            sentAt: { type: Date, default: Date.now },
            openedAt: { type: Date },
        },
    ],
    unsubscribeReason: defaultField(String),
    unsubscribedAt: defaultField(Date),
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
