const { string, validate, boolean, showRecords } = require("../../../Core/JoiUtils");

const schemas = {
	validateAddress: {
		id: string().required(),
	},
	validateTransactionHashs: {
		transactionHash: string().required(),
	},
	validateAddressTransactions: {
		page: string().required(),
		show: showRecords().required(),
	},
	validateTransactionId: {
		id: string().required(),
	},
	validateToken: {
		page: string(),
		show: showRecords(),
	},
};

const validateAddress = async (ctx, next) => {
	const valid = validate(schemas.validateAddress, ctx.request.params);

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

const validateToken = async (ctx, next) => {
	const valid = validate(schemas.validateToken, ctx.request.query);

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

const validateTransactionId = async (ctx, next) => {
	const valid = validate(schemas.validateTransactionId, ctx.request.params);

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
	validateToken,
	validateTransactionId,
};
