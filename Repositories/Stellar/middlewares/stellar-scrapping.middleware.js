const { string, validate } = require("../../../Core/JoiUtils");

// Stellar address: starts with G, 56 chars, base32 charset
const STELLAR_ADDRESS_REGEX = /^G[ABCDEFGHIJKLMNOPQRSTUVWXYZ234567]{55}$/;

const schemas = {
	validateAddress: {
		id: string()
			.required()
			.pattern(STELLAR_ADDRESS_REGEX, { name: "Stellar address" }),
	},
	validateAddressTransactions: {
		page: string().optional(),
		show: string().optional(),
		limit: string().optional(),
		cursor: string().optional(),
	},
};

const validateAddress = async (ctx, next) => {
	const valid = validate(schemas.validateAddress, ctx.request.params);

	if (valid.error) {
		ctx.status = 409;

		ctx.body = {
			validationError:
				valid.error.message ||
				"Invalid Stellar address. Must start with G and be 56 characters (e.g. GDQ7VEX63ZRI5D7QPKPS2SWYW4GS7OJUDTBTGIYEWMWCPIA4MWJORBU2)",
		};

		return;
	}

	await next();
};

const validateAddressTransactions = async (ctx, next) => {
	// Validate address in params (transactions/:id)
	const addressValid = validate(schemas.validateAddress, ctx.request.params);
	if (addressValid.error) {
		ctx.status = 409;
		ctx.body = {
			validationError:
				addressValid.error.message ||
				"Invalid Stellar address. Must start with G and be 56 characters.",
		};
		return;
	}

	const valid = validate(schemas.validateAddressTransactions, ctx.request.query);
	if (valid.error) {
		ctx.status = 409;
		ctx.body = { validationError: valid.error.message };
		return;
	}

	await next();
};

const validateTransactionHash = async (ctx, next) => {
	const valid = validate(
		{ id: string().required() },
		ctx.request.params
	);

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
	validateTransactionHash,
};
