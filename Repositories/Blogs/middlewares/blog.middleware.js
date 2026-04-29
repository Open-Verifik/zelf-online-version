const { string, validate, boolean, array, any } = require("../../../Core/JoiUtils");

const schemas = {
	create: {
		slug: string().required(),
		title: string().required(),
		description: string(),
		author: string(),
		date: any(),
		markdownContent: string().required(),
		coverImage: string(),
		imageAlt: any(),
		tags: array().items(string()),
		published: boolean(),
		canonicalSlug: string(),
        locale: string(),
	},
	update: {
		slug: string(),
		title: string(),
		description: string(),
		author: string(),
		date: any(),
		markdownContent: string(),
		coverImage: string(),
		imageAlt: any(),
		tags: array().items(string()),
		published: boolean(),
		canonicalSlug: string(),
        locale: string(),
	},
};

const verifySuperAdmin = async (ctx, next) => {
	if (!ctx.state.user || !ctx.state.user.superAdminId) {
		ctx.status = 403;
		ctx.body = { error: "Forbidden: Super Admin access required" };
		return;
	}
	await next();
};

const createValidation = async (ctx, next) => {
	const valid = validate(schemas.create, ctx.request.body);

	if (valid.error) {
		ctx.status = 409;
		ctx.body = { validationError: valid.error.message };
		return;
	}

	await next();
};

const updateValidation = async (ctx, next) => {
	const valid = validate(schemas.update, ctx.request.body);

	if (valid.error) {
		ctx.status = 409;
		ctx.body = { validationError: valid.error.message };
		return;
	}

	await next();
};

module.exports = {
	verifySuperAdmin,
	createValidation,
	updateValidation,
};
