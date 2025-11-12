const Model = require("../models/social-campaign-otp.model");
const config = require("../../../Core/config");
const axios = require("axios");
const crypto = require("crypto");
const { generateOTPEmailHTML } = require("../templates/otp-email.template");

const domain = "mg.zelf.world";

/**
 * Generate a 6-digit OTP code
 * @returns {string} 6-digit OTP code
 */
const generateOTP = () => {
	return crypto.randomInt(100000, 999999).toString();
};

/**
 * Send OTP email to user with HTML content
 * @param {string} email - User email address
 * @param {string} otp - OTP code to send
 * @param {string} language - Language code ('en' or 'es'), defaults to 'en'
 * @returns {Promise<Object>} Email sending result
 */
const sendOTPEmail = async (email, otp, language = "en") => {
	try {
		const isSpanish = language === "es" || language === "es-ES" || language === "es-MX";

		const subject = isSpanish ? "Código de Verificación de Email - Campaña Social" : "Email Verification Code - Social Campaign";

		const _to = config.env === "production" ? email : config.email_providers.mailgun.proxyEmail;

		const htmlContent = generateOTPEmailHTML(otp, language);

		const formData = new URLSearchParams();
		formData.append("from", "Zelf <noreply@mg.zelf.world>");
		formData.append("to", _to);
		formData.append("subject", subject);
		formData.append("html", htmlContent);

		try {
			if (config.debug.sendEmail) {
				console.log("Email data:", formData.toString());
				console.log(`[DEV] OTP for ${email}: ${otp}`);
			}

			const response = await axios.post(`https://api.mailgun.net/v3/${domain}/messages`, formData, {
				auth: {
					username: "api",
					password: config.email_providers.mailgun.apiKey,
				},
				headers: {
					"Content-Type": "application/x-www-form-urlencoded",
				},
			});

			if (config.debug.sendEmail) {
				console.log("Email response:", response.data);
			}

			// Fallback: log the OTP for development
			if (process.env.NODE_ENV !== "production") {
				console.log(`[DEV] OTP for ${email}: ${otp}`);
			}

			return response.data;
		} catch (exception) {
			console.error({
				emailException: exception,
				emailData: formData.toString(),
			});

			// Fallback: log the OTP for development
			if (process.env.NODE_ENV !== "production") {
				console.log(`[DEV] OTP for ${email}: ${otp}`);
			}

			return null;
		}
	} catch (error) {
		console.error("Error sending OTP email:", error);
		// Fallback: log the OTP for development
		if (process.env.NODE_ENV !== "production") {
			console.log(`[DEV] OTP for ${email}: ${otp}`);
		}
		throw new Error("Failed to send OTP email");
	}
};

/**
 * Step 1: Provide social email
 * Generates and sends OTP to the provided email
 * @param {string} email - User email address
 * @param {Object} authUser - Authenticated user from JWT
 * @returns {Promise<Object>} Response with success status
 */
const provideEmail = async (email, tagName, domain, authUser) => {
	// Check if there's an existing unverified OTP for this email
	const existingSocialRecord = await Model.findOne({
		email,
		tagName,
		domain,
	});

	if (existingSocialRecord && existingSocialRecord.verified) throw new Error("400:social_record_already_verified");

	// If there's an existing OTP and it was created less than 1 minute ago, rate limit
	if (existingSocialRecord) {
		const timeSinceCreation = Date.now() - existingSocialRecord.createdAt.getTime();

		const oneMinute = 60 * 1000;

		if (timeSinceCreation < oneMinute) throw new Error("429:please_wait_before_requesting_a_new_otp_code");

		// Delete old unverified OTP
		await Model.deleteOne({ _id: existingSocialRecord._id });
	}

	// Generate new OTP
	const otp = generateOTP();

	// Save OTP to database with TTL
	const socialRecord = new Model({
		email: email,
		otp: otp,
		verified: false,
		attempts: 0,
		tagName,
		domain,
		followedX: false,
		followedLinkedin: false,
	});

	await socialRecord.save();

	// Detect language from authUser or default to English
	const language = authUser?.language || authUser?.lang || "en";

	// Send OTP via email
	await sendOTPEmail(email, otp, language);

	return {
		success: true,
		message: "OTP code has been sent to your email",
		email: email,
		tagName: tagName,
		domain: domain,
		followedX: false,
		followedLinkedin: false,
	};
};

/**
 * Step 2: Validate OTP
 * Validates the OTP code for the provided email
 * @param {string} email - User email address
 * @param {string} otp - OTP code to validate
 * @param {Object} authUser - Authenticated user from JWT
 * @returns {Promise<Object>} Response with validation result
 */
const validateOTP = async (email, otp, tagName, domain, authUser) => {
	// Find the OTP record for this email
	const socialRecord = await Model.findOne({
		email: email,
		tagName,
		domain,
	});

	if (!socialRecord) throw new Error("404:social_record_not_found");

	if (socialRecord.verified) throw new Error("400:social_record_already_verified");

	// Check if maximum attempts exceeded
	if (socialRecord.attempts >= socialRecord.maxAttempts) {
		// Delete the OTP record to force a new request
		await Model.deleteOne({ _id: socialRecord._id });

		throw new Error("429:maximum_validation_attempts_exceeded");
	}

	// Increment attempts
	socialRecord.attempts += 1;

	// Validate OTP using bcrypt comparison
	const isOTPValid = await socialRecord.compareOTP(otp);

	if (!isOTPValid) {
		await socialRecord.save();

		throw new Error("400:invalid_otp_code");
	}

	// OTP is valid - mark as verified
	socialRecord.verified = true;

	await socialRecord.save();

	return {
		success: true,
		message: "Email validated successfully",
		email: socialRecord.email,
		tagName: socialRecord.tagName,
		domain: socialRecord.domain,
		followedX: socialRecord.followedX,
		followedLinkedin: socialRecord.followedLinkedin,
	};
};

module.exports = {
	provideEmail,
	validateOTP,
	generateOTP,
	sendOTPEmail,
};
