const { string, validate, number } = require("../../../Core/JoiUtils");

const schemas = {
	createAndSubmitPayment: {
		amount: number().required().positive(),
		faceBase64: string().required(),
		masterPassword: string(),
	},
};

const createAndSubmitPaymentValidation = async (ctx, next) => {
	const valid = validate(schemas.createAndSubmitPayment, ctx.request.body);

	if (valid.error) {
		ctx.status = 409;
		ctx.body = { validationError: valid.error.message };
		return;
	}

	await next();
};

module.exports = {
	createAndSubmitPaymentValidation,
};
