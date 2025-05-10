const {
	string,
	validate,
	showRecords,
	network,
	stringEnum,
	array,
	arrayAddress,
} = require("../../../Core/JoiUtils");
const Joi = require("joi");
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
	// transactions: {
	// 	accounts: array().required(),
	// 	limit: stringEnum([10, 100]).required(),
	// },
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
	network_: {
		network: stringEnum(["evm", "solana", "sui", "bitcoin"]).required(),
	},
	address_: {
		address: string().required(),
	},
	limit_: {
		limit: stringEnum([10, 100]).required(),
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
	let valid = validate(schemas.balance, ctx.request.body);

	const { accounts } = ctx.request.body;

	if (valid.error) {
		ctx.status = 409;
		ctx.body = { validationError: valid.error.message };
		return;
	}

	const errores = [];

	for (let i = 0; i < accounts.length; i++) {
		const account = accounts[i];
		const result = validate(schemas.network_, account);

		if (result.error) {
			errores.push({
				index: i,
				account,
				error: result.error.message,
			});
		}
	}
	for (let i = 0; i < accounts.length; i++) {
		const account = accounts[i];
		const result = validate(schemas.address_, account);

		if (result.error) {
			errores.push({
				index: i,
				account,
				error: result.error.message,
			});
		}
	}
	if (errores.length > 0) {
		ctx.status = 409;
		ctx.body = {
			validationError: "Some items failed validation",
			message: errores,
		};
		return;
	}

	await next();
};

const transactions = async (ctx, next) => {
	let valid = validate(schemas.balance, ctx.request.body);

	// Validar limit_
	let limitValid = validate(schemas.limit_, ctx.request.body);
	if (limitValid.error) {
		ctx.status = 409;
		ctx.body = { validationError: limitValid.error.message };
		return;
	}

	// Validar balance después de limit_
	valid = validate(schemas.balance, ctx.request.body);
	const { accounts } = ctx.request.body;

	if (valid.error) {
		ctx.status = 409;
		ctx.body = { validationError: valid.error.message };
		return;
	}

	const errores = [];

	// Validación de network_ en cada cuenta
	for (let i = 0; i < accounts.length; i++) {
		const account = accounts[i];
		const result = validate(schemas.network_, account);

		if (result.error) {
			errores.push({
				index: i,
				account,
				error: result.error.message,
			});
		}
	}

	// Validación de address_ en cada cuenta
	for (let i = 0; i < accounts.length; i++) {
		const account = accounts[i];
		const result = validate(schemas.address_, account);

		if (result.error) {
			errores.push({
				index: i,
				account,
				error: result.error.message,
			});
		}
	}

	// Si hay errores en las validaciones
	if (errores.length > 0) {
		ctx.status = 409;
		ctx.body = {
			validationError: "Some items failed validation",
			message: errores,
		};
		return;
	}

	await next(); // solo se llama si todas las validaciones son correctas
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
