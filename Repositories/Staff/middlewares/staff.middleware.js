const { string, validate, email, boolean, object } = require("../../../Core/JoiUtils");

const schemas = {
	invite: {
		staffEmail: email().required(),
		staffPhone: string().allow(null, "").optional(),
		staffName: string().required(),
		role: string().valid("admin", "read", "write").required(),
		faceBase64: string().required(),
		masterPassword: string().allow(null, "").optional(),
		isResend: boolean().optional(),
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
	updateRole: {
		staffEmail: email().required(),
		newRole: string().valid("admin", "read", "write").required(),
		faceBase64: string().required(),
		masterPassword: string().allow(null, "").optional(),
	},
	remove: {
		staffEmail: email().required(),
		faceBase64: string().required(),
		masterPassword: string().allow(null, "").optional(),
	},
	savePasskey: {
		email: email().optional(),
		phone: string().optional(),
		passkey: object({
			credentialId: string().required(),
			salt: string().required(),
			iv: string().required(),
			ciphertext: string().required(),
		}).required(),
	},
	updateProfile: {
		staffName: string().optional(),
		staffEmail: email().optional(),
		staffPhone: string().allow(null, "").optional(),
		staffCountryCode: string().allow(null, "").optional(),
		faceBase64: string().required(),
		masterPassword: string().allow(null, "").optional(),
		staffPhoto: string().optional(),
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

const updateRoleValidation = async (ctx, next) => {
	const valid = validate(schemas.updateRole, ctx.request.body);

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

const savePasskeyValidation = async (ctx, next) => {
	const valid = validate(schemas.savePasskey, ctx.request.body, ["email", "phone"]);

	if (valid.error) {
		ctx.status = 409;

		ctx.body = { validationError: valid.error.message };

		return;
	}

	await next();
};

const updateProfileValidation = async (ctx, next) => {
	// Sanitize country code if present
	if (ctx.request.body.staffCountryCode) {
		ctx.request.body.staffCountryCode = ctx.request.body.staffCountryCode.replace(/^[^\d+]*/, "").trim();
	}

	const valid = validate(schemas.updateProfile, ctx.request.body);

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
	updateRoleValidation,
	removeValidation,
	savePasskeyValidation,
	updateProfileValidation,
};
