const { string, validate, boolean, number, stringEnum, object } = require("../../../Core/JoiUtils");

/**
 * ZelfKey Middleware - Business logic validation for password manager operations
 * @author Miguel Trevino <miguel@zelf.world>
 */

/**
 * Supported data categories for ZelfKey storage
 */
const SUPPORTED_CATEGORIES = ["password", "notes", "credit_card", "contact"];

/**
 * Validation schemas for different data types
 */
const schemas = {
	// Website password schema
	password: {
		website: string().required(),
		username: string().required(),
		password: string().required(),
		folder: string(),
		insideFolder: boolean(),
		notes: string(),
		faceBase64: string().required(),
		masterPassword: string().required(),
	},
	// ZOTP schema
	zotp: {
		username: string().required(),
		setupKey: string().required(),
		issuer: string().required(),
		folder: string(),
		insideFolder: boolean(),
		faceBase64: string().required(),
		masterPassword: string().required(),
	},
	// Notes schema (key-value pairs)
	notes: {
		title: string().min(1).max(100).required(),
		keyValuePairs: object().required(),
		faceBase64: string().required(),
		folder: string(),
		insideFolder: boolean(),
		masterPassword: string(),
	},

	// Credit card schema
	creditCard: {
		cardName: string().required(),
		cardNumber: string().min(13).max(19).required(),
		expiryMonth: stringEnum(["01", "02", "03", "04", "05", "06", "07", "08", "09", "10", "11", "12"]).required(),
		expiryYear: string().length(4).required(),
		cvv: string().min(3).max(4).required(),
		bankName: string().required(),
		faceBase64: string().required(),
		folder: string(),
		insideFolder: boolean(),
		masterPassword: string(),
	},
	// Retrieve data schema
	retrieve: {
		zelfProof: string().required(),
		faceBase64: string().required(),
		password: string(),
	},
	// Preview data schema
	preview: {
		zelfProof: string().required(),
		faceBase64: string().required(),
	},
	// List data schema
	list: {
		category: stringEnum(SUPPORTED_CATEGORIES).required(),
	},
};

/**
 * Store password validation middleware
 */
const storePasswordValidation = async (ctx, next) => {
	const valid = validate(schemas.password, ctx.request.body);

	if (valid.error) {
		ctx.status = 409;
		ctx.body = { validationError: valid.error.message };
		return;
	}

	await next();
};

/**
 * Store ZOTP validation middleware
 */
const storeZOTPValidation = async (ctx, next) => {
	const valid = validate(schemas.zotp, ctx.request.body);

	if (valid.error) {
		ctx.status = 409;
		ctx.body = { validationError: valid.error.message };
		return;
	}

	await next();
};

/**
 * Store notes validation middleware
 */
const storeNotesValidation = async (ctx, next) => {
	const valid = validate(schemas.notes, ctx.request.body);

	if (valid.error) {
		ctx.status = 409;
		ctx.body = { validationError: valid.error.message };
		return;
	}

	// Additional business logic: validate key-value pairs
	const { keyValuePairs } = ctx.request.body;
	const pairs = Object.entries(keyValuePairs || {});

	if (pairs.length === 0) {
		ctx.status = 409;
		ctx.body = { validationError: "At least one key-value pair is required" };
		return;
	}

	// Validate maximum number of key-value pairs
	if (pairs.length > 10) {
		ctx.status = 409;
		ctx.body = { validationError: "Maximum 10 key-value pairs allowed" };
		return;
	}

	// Validate each key-value pair
	for (const [key, value] of pairs) {
		if (!key || key.trim().length === 0) {
			ctx.status = 409;
			ctx.body = { validationError: "Key names cannot be empty" };
			return;
		}
		if (key.length > 50) {
			ctx.status = 409;
			ctx.body = { validationError: "Key names cannot exceed 50 characters" };
			return;
		}
		if (typeof value !== "string" || value.length > 1000) {
			ctx.status = 409;
			ctx.body = { validationError: "Values must be strings and cannot exceed 1000 characters" };
			return;
		}
	}

	await next();
};

/**
 * Store credit card validation middleware
 */
const storeCreditCardValidation = async (ctx, next) => {
	const valid = validate(schemas.creditCard, ctx.request.body);

	if (valid.error) {
		ctx.status = 409;
		ctx.body = { validationError: valid.error.message };
		return;
	}

	// Additional business logic: validate credit card number format
	const { cardNumber, expiryMonth, expiryYear } = ctx.request.body;

	// Basic Luhn algorithm check for credit card
	if (!isValidCreditCard(cardNumber)) {
		ctx.status = 409;
		ctx.body = { validationError: "Invalid credit card number" };
		return;
	}

	// Validate expiry date
	const currentYear = new Date().getFullYear();
	const currentMonth = new Date().getMonth() + 1;

	if (parseInt(expiryYear) < currentYear || (parseInt(expiryYear) === currentYear && parseInt(expiryMonth) < currentMonth)) {
		ctx.status = 409;
		ctx.body = { validationError: "Credit card has expired" };
		return;
	}

	await next();
};

/**
 * Retrieve data validation middleware
 */
const retrieveValidation = async (ctx, next) => {
	const valid = validate(schemas.retrieve, ctx.request.body);

	if (valid.error) {
		ctx.status = 409;
		ctx.body = { validationError: valid.error.message };
		return;
	}

	await next();
};

const listValidation = async (ctx, next) => {
	const valid = validate(schemas.list, ctx.request.query);

	if (valid.error) {
		ctx.status = 409;
		ctx.body = { validationError: valid.error.message };
		return;
	}

	await next();
};

/**
 * Preview data validation middleware
 */
const previewValidation = async (ctx, next) => {
	const valid = validate(schemas.preview, ctx.request.body);

	if (valid.error) {
		ctx.status = 409;
		ctx.body = { validationError: valid.error.message };
		return;
	}

	await next();
};

/**
 * Luhn algorithm for credit card validation
 * @param {string} cardNumber - Credit card number to validate
 * @returns {boolean} - True if valid, false otherwise
 */
function isValidCreditCard(cardNumber) {
	// Remove spaces and dashes
	const cleanNumber = cardNumber.replace(/\s+/g, "").replace(/-/g, "");

	// Check if it's all digits
	if (!/^\d+$/.test(cleanNumber)) {
		return false;
	}

	let sum = 0;
	let isEven = false;

	// Loop through values starting from the rightmost side
	for (let i = cleanNumber.length - 1; i >= 0; i--) {
		let digit = parseInt(cleanNumber.charAt(i));

		if (isEven) {
			digit *= 2;
			if (digit > 9) {
				digit -= 9;
			}
		}

		sum += digit;
		isEven = !isEven;
	}

	return sum % 10 === 0;
}

module.exports = {
	SUPPORTED_CATEGORIES,
	storePasswordValidation,
	storeZOTPValidation,
	storeNotesValidation,
	storeCreditCardValidation,
	retrieveValidation,
	previewValidation,
	listValidation,
};
