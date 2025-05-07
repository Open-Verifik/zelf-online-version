const {
	string,
	validate,
	showRecords,
	network,
	array,
} = require("../../../Core/JoiUtils");

const schemas = {
	validateAddress: {
		address: string().required(),
	},
	validateTransactionHashs: {
		transactionHash: string().required(),
	},
	validateAddressTransactions: {
		show: string().required(),
	},
	validateToken: {
		page: string(),
		show: showRecords(),
	},
	address: {
		addresses: array().required(),
	},
	token: {
		network: network().required(),
		tokenContractAddress: string().required(),
	},
	tokens: {
		network: network().required(),
		name: string().required(),
	},
	gas: {
		network: network().required(),
	},
};
const validateTokens = async (ctx, next) => {
	const valid = validate(schemas.token, ctx.request.query);

	if (valid.error) {
		ctx.status = 409;

		ctx.body = { validationError: valid.error.message };

		return;
	}

	await next();
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
/////******************************************************************** */

const address = async (ctx, next) => {
	const valid = validate(schemas.address, ctx.request.body);

	if (valid.error) {
		ctx.status = 409;

		ctx.body = { validationError: valid.error.message };

		return;
	}

	await next();
};
const token = async (ctx, next) => {
	const valid = validate(schemas.token, ctx.request.query);

	if (valid.error) {
		ctx.status = 409;

		ctx.body = { validationError: valid.error.message };

		return;
	}

	await next();
};
const tokens = async (ctx, next) => {
	const valid = validate(schemas.tokens, ctx.request.query);

	if (valid.error) {
		ctx.status = 409;

		ctx.body = { validationError: valid.error.message };

		return;
	}

	await next();
};

const gas_tracker = async (ctx, next) => {
	const valid = validate(schemas.gas, ctx.request.query);

	if (valid.error) {
		ctx.status = 409;

		ctx.body = { validationError: valid.error.message };

		return;
	}

	await next();
};
const validateAddressTransactions = async (ctx, next) => {
	const valid = validate(
		schemas.validateAddressTransactions,
		ctx.request.query
	);

	if (valid.error) {
		ctx.status = 409;

		ctx.body = { validationError: valid.error.message };

		return;
	}

	await next();
};

module.exports = {
	validateTokens,
	validateAddress,
	validateTransactionHashs,
	validateAddressTransactions,
	address,
	gas_tracker,
	tokens,
	token,
};
