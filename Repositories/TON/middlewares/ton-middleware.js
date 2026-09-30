const { string, validate, showRecords, number } = require("../../../Core/JoiUtils");
const { assertValidTonAddress } = require("../modules/ton-address.util");

const schemas = {
	validateAddress: {
		id: string().required(),
	},
	validateAddressTransactions: {
		page: string().required(),
		show: showRecords().required(),
	},
	confirmPayment: {
		txHash: string().required(),
	},
	sendTransfer: {
		mnemonic: string().required(),
		toAddress: string().required(),
		amountTon: string().required(),
	},
	sendJetton: {
		mnemonic: string().required(),
		toAddress: string().required(),
		amount: string().required(),
		jettonMaster: string().required(),
		decimals: number().optional(),
	},
};

const validateAddress = async (ctx, next) => {
	const valid = validate(schemas.validateAddress, ctx.request.params);
	if (valid.error) {
		ctx.status = 409;
		ctx.body = { validationError: valid.error.message };
		return;
	}

	try {
		assertValidTonAddress(ctx.request.params.id);
	} catch (error) {
		ctx.status = error.status || 409;
		ctx.body = { validationError: error.message };
		return;
	}

	await next();
};

const validateAddressTransactions = async (ctx, next) => {
	const valid = validate(schemas.validateAddressTransactions, ctx.request.query);
	if (valid.error) {
		ctx.status = 409;
		ctx.body = { validationError: valid.error.message };
		return;
	}
	await next();
};

const confirmPaymentValidation = async (ctx, next) => {
	const valid = validate(schemas.confirmPayment, ctx.request.body);
	if (valid.error) {
		ctx.status = 409;
		ctx.body = { validationError: valid.error.message };
		return;
	}
	await next();
};

const sendTransferValidation = async (ctx, next) => {
	const valid = validate(schemas.sendTransfer, ctx.request.body);
	if (valid.error) {
		ctx.status = 409;
		ctx.body = { validationError: valid.error.message };
		return;
	}
	await next();
};

const sendJettonValidation = async (ctx, next) => {
	const valid = validate(schemas.sendJetton, ctx.request.body);
	if (valid.error) {
		ctx.status = 409;
		ctx.body = { validationError: valid.error.message };
		return;
	}
	await next();
};

module.exports = {
	validateAddress,
	validateAddressTransactions,
	confirmPaymentValidation,
	sendTransferValidation,
	sendJettonValidation,
};
