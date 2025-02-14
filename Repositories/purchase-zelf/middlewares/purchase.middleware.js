const {
	number,
	string,
	validate,
	zelfNameDuration_,
	crypto_,
} = require("../../../Core/JoiUtils");

const schemas = {
	validateParamas: {
		crypto: crypto_().required(),
		zelfName: string().required(),
		duration: zelfNameDuration_().required(),
	},
};

const validateParamas = async (ctx, next) => {
	const valid = validate(schemas.validateParamas, ctx.request.query);

	if (valid.error) {
		ctx.status = 409;

		ctx.body = { validationError: valid.error.message };

		return;
	}

	await next();
};

const schemasEmail = {
	validateParamas: {
		zelfName: string().required(),
		transactionDate: string().required(),
		price: number().required(),
		expires: string().required(),
		year: string().required(),
		email: string().required(),
	},
};
const validateParamasEmail = async (ctx, next) => {
	const valid = validate(schemasEmail.validateParamas, ctx.request.body);

	if (valid.error) {
		ctx.status = 409;

		ctx.body = { validationError: valid.error.message };

		return;
	}

	await next();
};

module.exports = {
	validateParamasEmail,
	validateParamas,
};
