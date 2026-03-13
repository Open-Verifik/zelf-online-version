const configuration = require("../../../Core/config");
const { validate, string } = require("../../../Core/JoiUtils");

const availablePlanKeys =
	Array.isArray(configuration.stripe?.plans) || typeof configuration.stripe?.plans === "object" ? Object.keys(configuration.stripe.plans) : [];

const schemas = {
	checkout: {
		planId: string()
			.required()
			.valid(...availablePlanKeys),
	},
};

const validateUserIdentifier = async (ctx, next) => {
	const { identifier } = ctx.state.user || {};

	if (!identifier) {
		ctx.status = 400;
		ctx.body = {
			error: "ZelfName identifier is required",
		};

		return;
	}

	await next();
};

const validateCheckoutRequest = async (ctx, next) => {
	try {
		const valid = validate(schemas.checkout, ctx.request.body);

		if (valid.error) {
			ctx.status = 400;
			ctx.body = {
				error: "Validation error",
				message: valid.error.message,
				availablePlans: availablePlanKeys,
			};

			return;
		}

		ctx.state.planDetails = configuration.stripe.plans[ctx.request.body.planId];

		await next();
	} catch (error) {
		console.error("Checkout validation error:", error);

		ctx.status = 500;
		ctx.body = {
			error: "Request validation failed",
			message: error.message,
		};
	}
};

module.exports = {
	validateUserIdentifier,
	validateCheckoutRequest,
};
