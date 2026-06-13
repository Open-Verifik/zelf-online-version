const mongoose = require("mongoose");

const Schema = mongoose.Schema;

const { requiredField, addBasicPlugins } = require("../../../Core/mongoose-utils");

const stepSchema = new Schema(
	{
		complete: { type: Boolean, default: false },
		completedAt: { type: Date },
		staffEmail: { type: String },
		zelfID: { type: String },
		identifier: { type: String },
	},
	{ _id: false }
);

const humanAuthnOnboardingSchema = new Schema({
	domainName: {
		...requiredField(String),
		unique: true,
		trim: true,
		index: true,
	},
	playCreate: { type: stepSchema, default: () => ({ complete: false }) },
	playPreview: { type: stepSchema, default: () => ({ complete: false }) },
	playDecrypt: { type: stepSchema, default: () => ({ complete: false }) },
});

addBasicPlugins(humanAuthnOnboardingSchema);

const HumanAuthnOnboarding =
	mongoose.models.HumanAuthnOnboarding || mongoose.model("HumanAuthnOnboarding", humanAuthnOnboardingSchema);

module.exports = HumanAuthnOnboarding;
