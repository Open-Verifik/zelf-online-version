const mongoose = require("mongoose");

const Schema = mongoose.Schema;
const { String } = mongoose.Schema.Types;

const { requiredField, defaultField, addBasicPlugins } = require("../../../Core/mongoose-utils");

const platformPolicySchema = new Schema(
    {
        latestVersion: requiredField(String),
        minimumVersion: requiredField(String),
        storeUrl: defaultField(String, ""),
    },
    { _id: false },
);

const mobileAppVersionPolicySchema = new Schema({
    key: { ...requiredField(String), unique: true, default: "default" },
    ios: { type: platformPolicySchema, required: true },
    android: { type: platformPolicySchema, required: true },
});

addBasicPlugins(mobileAppVersionPolicySchema);

const MobileAppVersionPolicy = mongoose.model("MobileAppVersionPolicy", mobileAppVersionPolicySchema);

module.exports = MobileAppVersionPolicy;
