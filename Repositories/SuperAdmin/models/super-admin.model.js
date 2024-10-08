const mongoose = require("mongoose");

const mongooseStringQuery = require("mongoose-string-query");

const timestamps = require("mongoose-timestamp");

const bcrypt = require("bcrypt-nodejs");

const SALT_WORK_FACTOR = 10;

const Schema = mongoose.Schema;

const { ObjectId, Date, Number, String, Boolean } = Schema.Types;

//####################################################//
const { requiredEnumField, optionalEnumField, requiredField, refField, defaultField } = require("../../../Core/mongoose-utils");

const SuperAdminSchema = new Schema({
	name: requiredField(String),
	status: requiredEnumField(String, ["invited", "joined", "banned"], "joined"),
	avatar: defaultField(String, null),
	countryCode: {
		type: String,
		required: false,
	},
	phone: {
		type: String,
		required: false,
		unique: true,
		index: {
			unique: true,
		},
	},
	email: {
		type: String,
		required: true,
		unique: true,
		index: {
			unique: true,
		},
	},
	biometricValidation: refField(ObjectId, "BiometricValidation"),
	active: {
		type: Boolean,
		required: true,
		default: true,
	},
	isEmailVerified: defaultField(Boolean, false),
	isPhoneVerified: defaultField(Boolean, false),
	isBiometricVerified: defaultField(Boolean, false),
	isVerified: defaultField(Boolean, false),
	notificationSettings: {
		type: ObjectId,
		ref: "NotificationSettings",
		required: false, // it will be required after this ticket
	},
	notes: {
		type: Schema.Types.String,
		required: false,
	},
	JWTPhrase: {
		type: String,
		required: false,
	},
	secretKey: {
		type: String,
		required: false,
		default: null,
	},
	language: {
		type: String,
		required: true,
		default: "en",
	},
	person: {
		type: ObjectId,
		ref: "Person",
		required: false,
	},
	apiKey: {
		type: String,
		required: true,
		default: null,
	},
});

SuperAdminSchema.pre("save", async function (next) {
	let user = this;
	// only hash the password if it has been modified (or is new)
	if (!user.isModified("apiKey")) return next();

	if (user.isModified("apiKey")) {
		// generate a salt
		bcrypt.genSalt(SALT_WORK_FACTOR, apiKeyEncrypted);

		function apiKeyEncrypted(err, salt) {
			if (err) return next("Error encrypting the password => ", err);
			// hash the apiKey using our new salt
			bcrypt.hash(
				user.apiKey,
				salt,
				function (error, progress) {},
				function (err, hash) {
					if (err) return next(err);

					user.apiKey = hash;

					next();
				}
			);
		}
	}
});

// Method to compare a provided API key with the stored hash
const isValidApiKey = async function (apiKey) {
	return await new Promise((resolve, reject) => {
		bcrypt.compare(apiKey, this.apiKey, function (err, isValid) {
			if (err) return reject(err);

			return resolve(isValid);
		});
	});
};

/**
 * @method comparing password to authenticate user
 * @param {string} candidatePassword
 * @param {function} callback
 */
function comparePassword(candidatePassword, callback) {
	bcrypt.compare(candidatePassword, this.password, function (err, isMatch) {
		if (err) return callback(err);

		callback(null, isMatch);
	});
}

/**
 * #model methods
 */
SuperAdminSchema.methods = {
	comparePassword,
	compareOTP,
	isValidApiKey,
};

/**
 * @method comparing password to authenticate user
 * @param {string} incomingOTP
 * @param {function} callback
 */
function compareOTP(incomingOTP, callback) {
	bcrypt.compare(incomingOTP, this.otp, function (err, isMatch) {
		if (err) return callback(err);

		callback(null, isMatch);
	});
}

SuperAdminSchema.plugin(timestamps);

SuperAdminSchema.plugin(mongooseStringQuery);

const SuperAdmin = mongoose.model("SuperAdmin", SuperAdminSchema);

module.exports = SuperAdmin;
