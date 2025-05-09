const {
	string,
	validate,
	showRecords,
	network,
	stringEnum,
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
	balance: {
		accounts: array().required(),
	},
	transactions: {
		accounts: array().required(),
		limit: stringEnum([10, 100]).required(),
	},
	token: {
		network: network().required(),
		tokenContractAddress: string().required(),
	},
	tokens: {
		network: network().required(),
		name: string().required(),
	},
	fee: {
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

const balance = async (ctx, next) => {
	const valid = validate(schemas.balance, ctx.request.body);

	if (valid.error) {
		ctx.status = 409;

		ctx.body = { validationError: valid.error.message };

		return;
	}

	await next();
};

const transactions = async (ctx, next) => {
	const valid = validate(schemas.transactions, ctx.request.body);

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

const networkFee = async (ctx, next) => {
	const valid = validate(schemas.fee, ctx.request.query);

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
	balance,
	token,
	tokens,
	transactions,
	networkFee,
};
