const { string, validate } = require("../../../Core/JoiUtils");

const schemas = {
	getById: {
		productId: string().required(),
	},
};

const getByIdValidation = async (ctx, next) => {
	const { productId } = ctx.params;

	const valid = validate(schemas.getById, { productId });

	if (valid.error) {
		ctx.status = 409;
		ctx.body = { validationError: valid.error.message };
		return;
	}

	await next();
};

module.exports = {
	getByIdValidation,
};
