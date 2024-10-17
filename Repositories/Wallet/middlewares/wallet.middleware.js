const { string, validate, boolean, number } = require("../../../Core/JoiUtils");

const schemas = {
	createWallet: {
		faceBase64: string().required(),
		password: string(),
		addServerPassword: boolean(),
		wordsCount: number().required(),
	},
	decryptWallet: {
		faceBase64: string().required(),
		identifier: string(),
		password: string(),
		zelfProof: string(),
		addServerPassword: boolean(),
	},
	zkProof: {
		faceBase64: string().required(),
		identifier: string(),
		password: string(),
		zelfProof: string(),
		addServerPassword: boolean(),
		zkProof: string().required(),
	},
	seeWallet: {
		identifier: string(),
		zelfProof: string().required(),
		addServerPassword: boolean(),
	},
	import: {
		faceBase64: string().required(),
		password: string(),
		phrase: string().required(),
	},
	searchOpenWallets: {
		address: string().required(),
	},
	uploadToIPFS: {
		qrCode: string().required(),
	},
};

/**
 * Get Validation
 * @param {*} request
 * @param {*} response
 * @param {*} next
 */
const getValidation = async (ctx, next) => {
	await next();
};

/**
 * Show Validation
 * @param {*} request
 * @param {*} response
 * @param {*} next
 */
const showValidation = async (ctx, next) => {
	await next();
};

/**
 * Create Validation
 * @param {*} request
 * @param {*} response
 * @param {*} next
 */
const createValidation = async (ctx, next) => {
	const valid = validate(schemas.createWallet, ctx.request.body);

	if (valid.error) {
		ctx.status = 409;

		ctx.body = { validationError: valid.error.message };

		return;
	}

	await next();
};

const decryptWalletValidation = async (ctx, next) => {
	const valid = validate(schemas.decryptWallet, ctx.request.body);

	if (valid.error) {
		ctx.status = 409;

		ctx.body = { validationError: valid.error.message };

		return;
	}

	await next();
};

const zkProofValidation = async (ctx, next) => {
	const valid = validate(schemas.zkProof, ctx.request.body);

	if (valid.error) {
		ctx.status = 409;

		ctx.body = { validationError: valid.error.message };

		return;
	}

	await next();
};

const seeWalletValidation = async (ctx, next) => {
	const valid = validate(schemas.seeWallet, ctx.request.body);

	if (valid.error) {
		ctx.status = 409;

		ctx.body = { validationError: valid.error.message };

		return;
	}

	await next();
};

/**
 * Update Validation
 * @param {*} request
 * @param {*} response
 * @param {*} next
 */
const updateValidation = async (ctx, next) => {
	await next();
};

/**
 * Destroy Validation
 * @param {*} request
 * @param {*} response
 * @param {*} next
 */
const importValidation = async (ctx, next) => {
	const valid = validate(schemas.import, ctx.request.body);

	if (valid.error) {
		ctx.status = 409;

		ctx.body = { validationError: valid.error.message };

		return;
	}

	await next();
};

const searchOpenWalletsValidation = async (ctx, next) => {
	const valid = validate(schemas.searchOpenWallets, ctx.request.query);

	if (valid.error) {
		ctx.status = 409;

		ctx.body = { validationError: valid.error.message };

		return;
	}

	await next();
};

const ipfsValidation = async (ctx, next) => {
	const valid = validate(schemas.uploadToIPFS, ctx.request.body);

	if (valid.error) {
		ctx.status = 409;

		ctx.body = { validationError: valid.error.message };

		return;
	}

	await next();
};

module.exports = {
	getValidation,
	showValidation,
	createValidation,
	decryptWalletValidation,
	seeWalletValidation,
	updateValidation,
	importValidation,
	searchOpenWalletsValidation,
	ipfsValidation,
	zkProofValidation,
};
