const { string, validate, boolean, stringEnum, object } = require("../../../Core/JoiUtils");

/**
 * ZelfKey Middleware - Business logic validation for password manager operations
 * @author Miguel Trevino <miguel@zelf.world>
 */

const SUPPORTED_CATEGORIES = ["password", "notes", "credit_card", "contact", "zotp"];

const schemas = {
	password: {
		website: string().required(),
		username: string().required(),
		password: string().required(),
		folder: string().optional().allow(""),
		insideFolder: boolean().optional().allow(false),
		notes: string().optional().allow(""),
		faceBase64: string().required(),
		masterPassword: string().optional().allow(""),
	},
	zotp: {
		username: string().required(),
		setupKey: string().required(),
		issuer: string().required(),
		folder: string().optional().allow(""),
		insideFolder: boolean().optional().allow(false),
		faceBase64: string().required(),
		masterPassword: string().optional().allow(""),
	},
	notes: {
		title: string().min(1).max(100).required(),
		keyValuePairs: object().required(),
		faceBase64: string().required(),
		folder: string().optional().allow(""),
		insideFolder: boolean().optional().allow(false),
		masterPassword: string().optional().allow(""),
	},
	creditCard: {
		cardName: string().required(),
		cardNumber: string().required(),
		expiryMonth: stringEnum(["01", "02", "03", "04", "05", "06", "07", "08", "09", "10", "11", "12"]).required(),
		expiryYear: string().length(4).required(),
		cvv: string().required(),
		bankName: string().required(),
		faceBase64: string().required(),
		folder: string().optional().allow(""),
		insideFolder: boolean().optional().allow(false),
		masterPassword: string().optional().allow(""),
	},
	retrieve: {
		zelfProof: string().required(),
		faceBase64: string().required(),
		password: string(),
	},
	preview: {
		zelfProof: string().required(),
		faceBase64: string().required(),
	},
	list: {
		category: stringEnum(SUPPORTED_CATEGORIES).required(),
		tagName: string().optional(),
	},
	listAll: {
		tagName: string().optional(),
	},
	listDashboard: {
		identifier: string().required().pattern(/^.+\..+$/),
		category: stringEnum(SUPPORTED_CATEGORIES).optional(),
	},
	listAllDashboard: {
		identifier: string().required().pattern(/^.+\..+$/),
	},
	delete: {
		id: string().required(),
		faceBase64: string().required(),
		masterPassword: string().optional().allow(""),
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
	const { expiryMonth, expiryYear } = ctx.request.body;

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

const listAllValidation = async (ctx, next) => {
	const valid = validate(schemas.listAll, ctx.request.query);

	if (valid.error) {
		ctx.status = 409;
		ctx.body = { validationError: valid.error.message };
		return;
	}

	await next();
};

/**
 * Dashboard list validation - requires identifier (user.domain format)
 */
const listDashboardValidation = async (ctx, next) => {
	const valid = validate(schemas.listDashboard, ctx.request.query);

	if (valid.error) {
		ctx.status = 409;
		ctx.body = { validationError: valid.error.message };
		return;
	}

	await next();
};

/**
 * Dashboard list-all validation - requires identifier (user.domain format)
 */
const listAllDashboardValidation = async (ctx, next) => {
	const valid = validate(schemas.listAllDashboard, ctx.request.query);

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

const deleteZelfKeyValidation = async (ctx, next) => {
	const valid = validate(schemas.delete, {
		id: ctx.request.params.id,
		faceBase64: ctx.request.body.faceBase64 || "",
		masterPassword: ctx.request.body.masterPassword || "",
	});

	if (valid.error) {
		ctx.status = 409;
		ctx.body = { validationError: valid.error.message };
		return;
	}

	await next();
};

module.exports = {
	SUPPORTED_CATEGORIES,
	storePasswordValidation,
	storeZOTPValidation,
	storeNotesValidation,
	storeCreditCardValidation,
	retrieveValidation,
	previewValidation,
	listValidation,
	listAllValidation,
	listDashboardValidation,
	listAllDashboardValidation,
	deleteZelfKeyValidation,
};
