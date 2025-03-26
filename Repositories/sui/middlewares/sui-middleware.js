const { string, validate, boolean, showRecords } = require("../../../Core/JoiUtils");

const schemas = {
	validateAddress: {
		address: string().required(),
	},
	validateTransactionHashs: {
		transactionHash: string().required(),
	},
	validateAddressTransactions: {
		address: string().required(),
		page: string().required(),
		show: showRecords().required(),
	},
};

const validateAddress = async (ctx, next) => {
	const valid = validate(schemas.validateAddress, ctx.request.query);

	if (valid.error) {
		ctx.status = 409;

		ctx.body = { validationError: valid.error.message };

		return;
	}

	await next();
};
const validateTransactionHashs = async (ctx, next) => {
	const valid = validate(schemas.validateTransactionHashs, ctx.request.query);

	if (valid.error) {
		ctx.status = 409;

		ctx.body = { validationError: valid.error.message };

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

module.exports = {
	validateAddress,
	validateTransactionHashs,
	validateAddressTransactions,
};
