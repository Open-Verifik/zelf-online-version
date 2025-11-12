const mongoose = require("mongoose");
const bcrypt = require("bcrypt-nodejs");

const SALT_WORK_FACTOR = 10;

const socialCampaignOTPSchema = new mongoose.Schema(
	{
		email: {
			type: String,
			required: true,
			index: true,
		},
		otp: {
			type: String,
			required: true,
		},
		verified: {
			type: Boolean,
			default: false,
		},
		attempts: {
			type: Number,
			default: 0,
		},
		maxAttempts: {
			type: Number,
			default: 5,
		},
		// TTL field - documents will be automatically deleted after 10 minutes
		expiresAt: {
			type: Date,
			default: Date.now,
			expires: 600, // 10 minutes in seconds
		},
		tagName: {
			type: String,
			required: true,
		},
		domain: {
			type: String,
			required: true,
		},
		followedX: {
			type: Boolean,
			default: false,
		},
		followedLinkedin: {
			type: Boolean,
			default: false,
		},
	},
	{
		timestamps: true,
	}
);

// Hash OTP before saving
socialCampaignOTPSchema.pre("save", function (next) {
	const record = this;
	// only hash the OTP if it has been modified (or is new)
	if (!record.isModified("otp")) return next();

	// generate a salt
	bcrypt.genSalt(SALT_WORK_FACTOR, function (err, salt) {
		if (err) return next(err);

		// hash the OTP using our new salt
		bcrypt.hash(record.otp, salt, null, function (err, hash) {
			if (err) return next(err);

			// override the cleartext OTP with the hashed one
			record.otp = hash;
			next();
		});
	});
});

/**
 * Method to compare a provided OTP with the stored hash
 * @param {string} candidateOTP - OTP code to compare
 * @returns {Promise<boolean>} True if OTP matches, false otherwise
 */
socialCampaignOTPSchema.methods.compareOTP = function (candidateOTP) {
	return new Promise((resolve, reject) => {
		bcrypt.compare(candidateOTP, this.otp, function (err, isMatch) {
			if (err) return reject(err);
			return resolve(isMatch);
		});
	});
};

// Indexes
socialCampaignOTPSchema.index({ email: 1, verified: 1 });
socialCampaignOTPSchema.index({ createdAt: -1 });
socialCampaignOTPSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 600 });

module.exports = mongoose.model("SocialCampaignOTP", socialCampaignOTPSchema);
