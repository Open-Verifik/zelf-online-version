const { string, validate, boolean, number } = require("../../../Core/JoiUtils");

const schemas = {
	validateParamas: {
		symbol: string().required(),
		interval: string().required(),
		limit: string().required(),
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

module.exports = {
	validateParamas,
};
