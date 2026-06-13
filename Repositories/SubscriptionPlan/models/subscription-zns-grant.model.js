const mongoose = require("mongoose");

const Schema = mongoose.Schema;
const { requiredEnumField, requiredField, addBasicPlugins } = require("../../../Core/mongoose-utils");

/**
 * Idempotent monthly ZNS grant ledger keyed by Stripe invoice.id (invoice.payment_succeeded).
 */
const subscriptionZnsGrantSchema = new Schema({
    invoiceId: {
        type: String,
        required: true,
        unique: true,
        trim: true,
    },
    subscriptionId: requiredField(String),
    customerEmail: requiredField(String),
    planCode: requiredField(String),
    tokenAmount: requiredField(Number),
    status: requiredEnumField(String, ["pending", "completed", "failed"], "pending"),
    signature: { type: String },
    errorMessage: { type: String },
});

addBasicPlugins(subscriptionZnsGrantSchema);

const SubscriptionZnsGrant =
    mongoose.models.SubscriptionZnsGrant || mongoose.model("SubscriptionZnsGrant", subscriptionZnsGrantSchema);

module.exports = SubscriptionZnsGrant;
