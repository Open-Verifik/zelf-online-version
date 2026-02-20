const { string, validate, email, array, number, object, boolean } = require("../../../Core/JoiUtils");

const schemas = {
	invite: {
		lawyerEmail: email().required(),
		lawyerPhone: string().allow(null, "").optional(),
		lawyerCountryCode: string().allow(null, "").optional(),
		lawyerName: string().required(),
		domain: string().optional(),
		faceBase64: string().required(),
		masterPassword: string().allow(null, "").optional(),
	},
	createFromInvitation: {
		invitationToken: string().required(),
		faceBase64: string().required(),
		masterPassword: string().allow(null, "").optional(),
	},
	auth: {
		email: email().required(),
		faceBase64: string().required(),
		masterPassword: string().allow(null, "").optional(),
	},
	updateProfile: {
		name: string().optional(),
		phone: string().allow(null, "").optional(),
		countryCode: string().allow(null, "").optional(),
		specialization: array().items(string()).optional(),
		education: array().items(string()).optional(),
		location: object({
			city: string().allow(null, "").optional(),
			country: string().allow(null, "").optional(),
		}).optional(),
		bio: string().allow(null, "").optional(),
		hourlyRate: number().min(0).optional(),
		licenseNumber: string().optional(),
		professionalId: string().allow(null, "").optional(),
		zelfName: string().optional(),
		contactEmail: email().optional(),
		faceBase64: string().required(),
		masterPassword: string().allow(null, "").optional(),
	},
	setPreferred: {
		domain: string().optional(),
		preferredLawyerZelfNames: array().items(string()).required(),
		defaultLawyerZelfName: string().allow(null, "").optional(),
	},
	remove: {
		lawyerEmail: email().required(),
		faceBase64: string().required(),
		masterPassword: string().allow(null, "").optional(),
	},
	submitReview: {
		lawyerWalletAddress: string().required(),
		rating: number().min(1).max(5).required(),
		tags: array().items(string()).optional(),
		comment: string().allow(null, "").optional(),
		paymentTxHash: string().allow(null, "").optional(),
	},
	search: {
		q: string().allow(null, "").optional(),
		domain: string().optional(),
		city: string().allow(null, "").optional(),
		country: string().allow(null, "").optional(),
		maxRate: number().min(0).optional(),
		license: string().allow(null, "").optional(),
		professionalId: string().allow(null, "").optional(),
		walletAddress: string().allow(null, "").optional(),
		zelfName: string().allow(null, "").optional(),
	},
};

const inviteValidation = async (ctx, next) => {
	const valid = validate(schemas.invite, ctx.request.body);
	if (valid.error) {
		ctx.status = 409;
		ctx.body = { validationError: valid.error.message };
		return;
	}
	await next();
};

const createFromInvitationValidation = async (ctx, next) => {
	const valid = validate(schemas.createFromInvitation, ctx.request.body);
	if (valid.error) {
		ctx.status = 409;
		ctx.body = { validationError: valid.error.message };
		return;
	}
	await next();
};

const authValidation = async (ctx, next) => {
	const valid = validate(schemas.auth, ctx.request.body);
	if (valid.error) {
		ctx.status = 409;
		ctx.body = { validationError: valid.error.message };
		return;
	}
	await next();
};

const updateProfileValidation = async (ctx, next) => {
	const valid = validate(schemas.updateProfile, ctx.request.body);
	if (valid.error) {
		ctx.status = 409;
		ctx.body = { validationError: valid.error.message };
		return;
	}
	await next();
};

const setPreferredValidation = async (ctx, next) => {
	const valid = validate(schemas.setPreferred, ctx.request.body);
	if (valid.error) {
		ctx.status = 409;
		ctx.body = { validationError: valid.error.message };
		return;
	}
	await next();
};

const removeValidation = async (ctx, next) => {
	const valid = validate(schemas.remove, ctx.request.body);
	if (valid.error) {
		ctx.status = 409;
		ctx.body = { validationError: valid.error.message };
		return;
	}
	await next();
};

const submitReviewValidation = async (ctx, next) => {
	const valid = validate(schemas.submitReview, ctx.request.body);
	if (valid.error) {
		ctx.status = 409;
		ctx.body = { validationError: valid.error.message };
		return;
	}
	await next();
};

const searchValidation = async (ctx, next) => {
	const valid = validate(schemas.search, ctx.request.query);
	if (valid.error) {
		ctx.status = 409;
		ctx.body = { validationError: valid.error.message };
		return;
	}
	await next();
};

module.exports = {
	inviteValidation,
	createFromInvitationValidation,
	authValidation,
	updateProfileValidation,
	setPreferredValidation,
	removeValidation,
	submitReviewValidation,
	searchValidation,
};
