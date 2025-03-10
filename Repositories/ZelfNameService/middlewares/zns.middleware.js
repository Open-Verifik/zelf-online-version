const { string, validate, boolean, number, stringEnum } = require("../../../Core/JoiUtils");
const captchaService = require("../../../Core/captcha");
const config = require("../../../Core/config");

const schemas = {
	search: {
		zelfName: string(),
		key: string(),
		value: string(),
		os: stringEnum(["DESKTOP", "ANDROID", "IOS"]),
		captchaToken: string(),
	},
	leaseOffline: {
		zelfName: string().required(),
		zelfProof: string().required(),
		zelfProofQRCode: string().required(),
	},
	leaseConfirmation: {
		zelfName: string().required(),
		coin: string().required(),
		network: stringEnum(["coinbase", "CB", "ETH", "SOL", "BTC"]).required(),
	},
	lease: {
		zelfName: string().required(),
		faceBase64: string().required(),
		type: stringEnum(["create", "import"]).required(),
		os: stringEnum(["DESKTOP", "ANDROID", "IOS"]).required(),
		captchaToken: string().required(),
	},
	create: {
		password: string(),
		addServerPassword: boolean(),
		wordsCount: number().required(),
	},
	import: {
		password: string(),
		mnemonic: string().required(),
	},
	decrypt: {
		faceBase64: string().required(),
		password: string(),
		zelfName: string().required(),
		addServerPassword: boolean(),
		os: stringEnum(["DESKTOP", "ANDROID", "IOS"]).required(),
		captchaToken: string().required(),
	},
	preview: {
		zelfName: string().required(),
		os: stringEnum(["DESKTOP", "ANDROID", "IOS"]).required(),
		captchaToken: string().required(),
	},
	previewZelfProof: {
		zelfProof: string().required(),
		os: stringEnum(["DESKTOP", "ANDROID", "IOS"]).required(),
		captchaToken: string().required(),
	},
	revenueCatWebhook: {
		product_id: string().required(),
		period_type: string().required(),
		currency: string().required(),
		price: number().required(),
		id: string().required(),
		app_id: string().required(),
		transaction_id: string().required(),
		environment: string().required(),
	},
	update: {
		duration: stringEnum(["1", "2", "3", "4", "5", "lifetime"]).required(),
	},
};

/**
 * Get Validation
 * @param {*} request
 * @param {*} response
 * @param {*} next
 */
const getValidation = async (ctx, next) => {
	const payload = Object.assign(ctx.request.query, ctx.request.body);

	const valid = validate(schemas.search, payload);

	if (valid.error) {
		ctx.status = 409;

		ctx.body = { validationError: valid.error.message };

		return;
	}

	const { zelfName, key, value, captchaToken, os } = payload;

	if (!zelfName && (!key || !value)) {
		ctx.status = 409;

		ctx.body = { validationError: "missing zelfName or search by key|value" };

		return;
	}

	const _zelfName = zelfName || value;

	const captchaZelfName = _getZelfNameForCaptcha(_zelfName);

	const captchaScore = captchaToken ? await captchaService.createAssessment(captchaToken, os, captchaZelfName) : 1;

	if (captchaScore < 0.79) {
		ctx.status = 409;

		ctx.body = { captchaScore, validationError: "Captcha not acceptable" };

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

	if (valid.error) {
		ctx.status = 409;

		ctx.body = { validationError: valid.error.message };

		return;
	}

	const { type, zelfName, captchaToken, os, skipIt } = ctx.request.body;

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

	if (zelfName.length < 6) {
		ctx.status = 409;
		ctx.body = { validationError: "ZelfName should be 1 character or more." };
		return;
	}

	const captchaZelfName = _getZelfNameForCaptcha(`${zelfName}`);

	const captchaScore = config.google.captchaApproval || (await captchaService.createAssessment(captchaToken, os, captchaZelfName, skipIt));

	if (captchaScore < 0.79) {
		_consoleLogSuspicious(ctx, captchaScore, zelfName);

		ctx.status = 409;

		ctx.body = { captchaScore, validationError: "Captcha not acceptable" };

		return;
	}

	// await ZNSTokenModule.giveTokensAfterPurchase();

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

const _consoleLogSuspicious = (ctx, captchaScore, zelfName) => {
	const origin = ctx.request.header.origin || null;
	const referer = ctx.request.header.referer || null;
	const clientIp = ctx.request.ip;
	const userAgent = ctx.request.header["user-agent"] || null;

	const forwardedFor = ctx.request.header["x-forwarded-for"] || "No X-Forwarded-For header";
	console.log(`Request Details: 
			CaptchaScore: ${captchaScore}
			ZelfName: ${zelfName}
			Origin: ${origin}
			Referer: ${referer}
			Client IP: ${clientIp}
			User Agent: ${userAgent}
			X-Forwarded-For: ${forwardedFor}
		`);
};

const previewZelfProofValidation = async (ctx, next) => {
	const validation = validate(schemas.previewZelfProof, ctx.request.body);

	if (validation.error) {
		ctx.status = 409;

		ctx.body = { validationError: validation.error.message };

		return;
	}

	const { captchaToken, os, zelfProof } = ctx.request.body;

	const captchaScore = await captchaService.createAssessment(captchaToken, os, "preview");

	if (captchaScore < 0.79) {
		ctx.status = 409;

		ctx.body = { captchaScore, validationError: "Captcha not acceptable" };

		return;
	}

	await next();
};

const previewValidation = async (ctx, next) => {
	const validation = validate(schemas.preview, ctx.request.body);

	if (validation.error) {
		ctx.status = 409;

		ctx.body = { validationError: validation.error.message };

		return;
	}

	const { captchaToken, os, zelfName } = ctx.request.body;

	const captchaZelfName = _getZelfNameForCaptcha(zelfName);

	const captchaScore = await captchaService.createAssessment(captchaToken, os, captchaZelfName);

	if (captchaScore < 0.79) {
		ctx.status = 409;

		ctx.body = { captchaScore, validationError: "Captcha not acceptable" };

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

	const { captchaToken, os, zelfName } = ctx.request.body;

	const captchaZelfName = _getZelfNameForCaptcha(zelfName);

	const captchaScore = await captchaService.createAssessment(captchaToken, os, captchaZelfName);

	if (captchaScore < 0.79) {
		ctx.status = 409;

		ctx.body = { captchaScore, validationError: "Captcha not acceptable" };

		return;
	}

	await next();
};

const revenueCatWebhookValidation = async (ctx, next) => {
	const { event } = ctx.request.body;

	const { clientId, email } = ctx.state.user;

	if (!clientId || email !== config.revenueCat.allowedEmail) {
		ctx.status = 403;
		ctx.body = { validationError: "Access forbidden" };
		return;
	}

	if (!event) {
		ctx.status = 409;
		ctx.body = { validationError: "Missing event payload" };
		return;
	}

	const valid = validate(schemas.revenueCatWebhook, ctx.request.body?.event);

	if (valid.error) {
		ctx.status = 409;
		ctx.body = { validationError: valid.error.message };
	}

	await next();
};

const referralRewardsValidation = async (ctx, next) => {
	const { superAdminId } = ctx.state.user;

	if (!superAdminId) {
		ctx.status = 403;

		ctx.body = { error: "Unauthorized" };

		return;
	}

	await next();
};

const updateValidation = async (ctx, next) => {
	const { zelfName } = ctx.state.user;

	if (!zelfName) {
		ctx.status = 403;
		ctx.body = { validationError: "Access forbidden" };
		return;
	}

	const valid = validate(schemas.update, ctx.request.body);

	if (valid.error) {
		ctx.status = 409;
		ctx.body = { validationError: valid.error.message };
		return;
	}

	await next();
};

const _getZelfNameForCaptcha = (zelfName) => {
	return zelfName.split(".zelf")[0].replace(".", "_");
};

module.exports = {
	getValidation,
	leaseValidation,
	leaseConfirmationValidation,
	previewValidation,
	previewZelfProofValidation,
	deleteValidation,
	decryptValidation,
	//offline
	leaseOfflineValidation,
	revenueCatWebhookValidation,
	referralRewardsValidation,
	//update
	updateValidation,
};
