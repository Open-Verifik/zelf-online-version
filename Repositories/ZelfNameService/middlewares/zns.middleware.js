const { string, validate, boolean, number, stringEnum } = require("../../../Core/JoiUtils");

const schemas = {
	lease: {
		type: stringEnum(["create", "import"]).required(),
		// years: number().required(),
	},
	leaseOffline: {
		zelfName: string().required(),
		zelfProof: string().required(),
		zelfProofQRCode: string().required(),
	},
	leaseConfirmation: {
		zelfName: string().required(),
		coin: string().required(),
		network: string().required(),
	},
	create: {
		zelfName: string().required(),
		faceBase64: string().required(),
		password: string(),
		addServerPassword: boolean(),
		wordsCount: number().required(),
	},
	import: {
		zelfName: string().required(),
		faceBase64: string().required(),
		password: string(),
		mnemonic: string().required(),
	},
	decrypt: {
		faceBase64: string().required(),
		password: string(),
		zelfName: string().required(),
		addServerPassword: boolean(),
	},
	preview: {
		zelfName: string().required(),
	},
};

/**
 * Get Validation
 * @param {*} request
 * @param {*} response
 * @param {*} next
 */
const getValidation = async (ctx, next) => {
	const { zelfName, key, value } = ctx.request.query;

	if (!zelfName && (!key || !value)) {
		ctx.status = 409;

		ctx.body = { validationError: "missing zelfName or search by key|value" };

		return;
	}

	await next();
};

/**
 *
 * @param {*} ctx
 * @param {*} next
 */
const leaseValidation = async (ctx, next) => {
	const valid = validate(schemas.lease, ctx.request.body);

	const { clientId } = ctx.state.user;

	if (!clientId) {
		ctx.status = 403;

		ctx.body = { validationError: "Access forbidden" };

		return;
	}

	if (valid.error) {
		ctx.status = 409;

		ctx.body = { validationError: valid.error.message };

		return;
	}

	const { type, zelfName } = ctx.request.body;

	const typeValid = validate(schemas[type], ctx.request.body);

	if (typeValid.error) {
		ctx.status = 409;

		ctx.body = { validationError: typeValid.error.message };

		return;
	}

	if (!zelfName.includes(".zelf")) {
		ctx.status = 409;

		ctx.body = { validationError: "Not a valid zelf name" };

		return;
	}

	await next();
};

/**
 * lease offline validation
 * @param {Object} ctx
 * @param {Object} next
 */
const leaseOfflineValidation = async (ctx, next) => {
	const valid = validate(schemas.leaseOffline, ctx.request.body);

	if (valid.error) {
		ctx.status = 409;

		ctx.body = { validationError: valid.error.message };

		return;
	}

	await next();
};

const leaseConfirmationValidation = async (ctx, next) => {
	// Step 1: Extract necessary data from the request
	const { zelfName, purchaseDetails } = ctx.request.body;

	const validation = validate(schemas.leaseConfirmation, ctx.request.body);

	// Step 2: Validate the Zelf name service purchase details
	if (validation.error) {
		ctx.status = 400;

		ctx.body = { validationError: validation.error.message };

		return;
	}

	// validation logic
	const isValidPurchase = validatePurchaseDetails(zelfName, purchaseDetails);

	// Step 3: Return a response indicating success or failure
	if (!isValidPurchase) {
		ctx.status = 400;

		ctx.body = { validationError: "Invalid lease confirmation details" };
	}

	await next();
};

// Example validation function (replace with actual logic)
function validatePurchaseDetails(zelfName, purchaseDetails) {
	// Implement actual validation logic here
	return true; // Placeholder
}

const previewValidation = async (ctx, next) => {
	const validation = validate(schemas.preview, ctx.request.body);

	if (validation.error) {
		ctx.status = 409;

		ctx.body = { validationError: validation.error.message };

		return;
	}

	await next();
};

const deleteValidation = async (ctx, next) => {
	await next();
};

/**
 * decrypt validation
 * @param {Object} ctx
 * @param {Object} next
 */
const decryptValidation = async (ctx, next) => {
	const validation = validate(schemas.decrypt, ctx.request.body);

	if (validation.error) {
		ctx.status = 409;

		ctx.body = { validationError: validation.error.message };

		return;
	}

	await next();
};

module.exports = {
	getValidation,
	leaseValidation,
	leaseConfirmationValidation,
	previewValidation,
	deleteValidation,
	decryptValidation,
	//offline
	leaseOfflineValidation,
};
