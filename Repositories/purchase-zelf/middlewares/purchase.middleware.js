const {
	string,
	validate,
	zelfNameDuration_,
} = require("../../../Core/JoiUtils");

const schemas = {
	validateParamas: {
		crypto: string().required(),
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

module.exports = {
	validateParamas,
};
