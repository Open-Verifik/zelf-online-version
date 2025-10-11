const { string, validate, object, boolean } = require("../../../Core/JoiUtils");

const schemas = {
	getTheme: {
		// No specific validation needed for getting theme settings
	},
	updateTheme: {
		faceBase64: string().base64().required(),
		masterPassword: string().optional().allow(""),
		themeSettings: object({
			zns: object({
				enabled: boolean().default(true),
				currentMode: string().valid("light", "dark").default("light"),
				lightMode: object({
					colors: object({
						primary: string()
							.pattern(/^#[0-9A-Fa-f]{6}$/)
							.required(),
						secondary: string()
							.pattern(/^#[0-9A-Fa-f]{6}$/)
							.required(),
						background: string()
							.pattern(/^#[0-9A-Fa-f]{6}$/)
							.required(),
						backgroundSecondary: string()
							.pattern(/^#[0-9A-Fa-f]{6}$/)
							.required(),
						text: string()
							.pattern(/^#[0-9A-Fa-f]{6}$/)
							.required(),
						textSecondary: string()
							.pattern(/^#[0-9A-Fa-f]{6}$/)
							.required(),
						textMuted: string()
							.pattern(/^#[0-9A-Fa-f]{6}$/)
							.required(),
						header: string()
							.pattern(/^#[0-9A-Fa-f]{6}$/)
							.required(),
						headerText: string()
							.pattern(/^#[0-9A-Fa-f]{6}$/)
							.required(),
						button: string()
							.pattern(/^#[0-9A-Fa-f]{6}$/)
							.required(),
						buttonText: string()
							.pattern(/^#[0-9A-Fa-f]{6}$/)
							.required(),
						buttonHover: string()
							.pattern(/^#[0-9A-Fa-f]{6}$/)
							.required(),
						buttonSecondary: string()
							.pattern(/^#[0-9A-Fa-f]{6}$/)
							.required(),
						buttonSecondaryText: string()
							.pattern(/^#[0-9A-Fa-f]{6}$/)
							.required(),
						border: string()
							.pattern(/^#[0-9A-Fa-f]{6}$/)
							.required(),
						borderHover: string()
							.pattern(/^#[0-9A-Fa-f]{6}$/)
							.required(),
						success: string()
							.pattern(/^#[0-9A-Fa-f]{6}$/)
							.required(),
						successText: string()
							.pattern(/^#[0-9A-Fa-f]{6}$/)
							.required(),
						warning: string()
							.pattern(/^#[0-9A-Fa-f]{6}$/)
							.required(),
						warningText: string()
							.pattern(/^#[0-9A-Fa-f]{6}$/)
							.required(),
						error: string()
							.pattern(/^#[0-9A-Fa-f]{6}$/)
							.required(),
						errorText: string()
							.pattern(/^#[0-9A-Fa-f]{6}$/)
							.required(),
						card: string()
							.pattern(/^#[0-9A-Fa-f]{6}$/)
							.required(),
						cardBorder: string()
							.pattern(/^#[0-9A-Fa-f]{6}$/)
							.required(),
						shadow: string()
							.pattern(/^rgba\(\d+,\s*\d+,\s*\d+,\s*[0-1]?\.?\d+\)$/)
							.required(),
					}).required(),
				}).required(),
				darkMode: object({
					colors: object({
						primary: string()
							.pattern(/^#[0-9A-Fa-f]{6}$/)
							.required(),
						secondary: string()
							.pattern(/^#[0-9A-Fa-f]{6}$/)
							.required(),
						background: string()
							.pattern(/^#[0-9A-Fa-f]{6}$/)
							.required(),
						backgroundSecondary: string()
							.pattern(/^#[0-9A-Fa-f]{6}$/)
							.required(),
						text: string()
							.pattern(/^#[0-9A-Fa-f]{6}$/)
							.required(),
						textSecondary: string()
							.pattern(/^#[0-9A-Fa-f]{6}$/)
							.required(),
						textMuted: string()
							.pattern(/^#[0-9A-Fa-f]{6}$/)
							.required(),
						header: string()
							.pattern(/^#[0-9A-Fa-f]{6}$/)
							.required(),
						headerText: string()
							.pattern(/^#[0-9A-Fa-f]{6}$/)
							.required(),
						button: string()
							.pattern(/^#[0-9A-Fa-f]{6}$/)
							.required(),
						buttonText: string()
							.pattern(/^#[0-9A-Fa-f]{6}$/)
							.required(),
						buttonHover: string()
							.pattern(/^#[0-9A-Fa-f]{6}$/)
							.required(),
						buttonSecondary: string()
							.pattern(/^#[0-9A-Fa-f]{6}$/)
							.required(),
						buttonSecondaryText: string()
							.pattern(/^#[0-9A-Fa-f]{6}$/)
							.required(),
						border: string()
							.pattern(/^#[0-9A-Fa-f]{6}$/)
							.required(),
						borderHover: string()
							.pattern(/^#[0-9A-Fa-f]{6}$/)
							.required(),
						success: string()
							.pattern(/^#[0-9A-Fa-f]{6}$/)
							.required(),
						successText: string()
							.pattern(/^#[0-9A-Fa-f]{6}$/)
							.required(),
						warning: string()
							.pattern(/^#[0-9A-Fa-f]{6}$/)
							.required(),
						warningText: string()
							.pattern(/^#[0-9A-Fa-f]{6}$/)
							.required(),
						error: string()
							.pattern(/^#[0-9A-Fa-f]{6}$/)
							.required(),
						errorText: string()
							.pattern(/^#[0-9A-Fa-f]{6}$/)
							.required(),
						card: string()
							.pattern(/^#[0-9A-Fa-f]{6}$/)
							.required(),
						cardBorder: string()
							.pattern(/^#[0-9A-Fa-f]{6}$/)
							.required(),
						shadow: string()
							.pattern(/^rgba\(\d+,\s*\d+,\s*\d+,\s*[0-1]?\.?\d+\)$/)
							.required(),
					}).required(),
				}).required(),
			}).required(),
			zelfkeys: object({
				enabled: boolean().default(true),
				currentMode: string().valid("light", "dark").default("light"),
				lightMode: object({
					colors: object({
						primary: string()
							.pattern(/^#[0-9A-Fa-f]{6}$/)
							.required(),
						secondary: string()
							.pattern(/^#[0-9A-Fa-f]{6}$/)
							.required(),
						background: string()
							.pattern(/^#[0-9A-Fa-f]{6}$/)
							.required(),
						backgroundSecondary: string()
							.pattern(/^#[0-9A-Fa-f]{6}$/)
							.required(),
						text: string()
							.pattern(/^#[0-9A-Fa-f]{6}$/)
							.required(),
						textSecondary: string()
							.pattern(/^#[0-9A-Fa-f]{6}$/)
							.required(),
						textMuted: string()
							.pattern(/^#[0-9A-Fa-f]{6}$/)
							.required(),
						header: string()
							.pattern(/^#[0-9A-Fa-f]{6}$/)
							.required(),
						headerText: string()
							.pattern(/^#[0-9A-Fa-f]{6}$/)
							.required(),
						button: string()
							.pattern(/^#[0-9A-Fa-f]{6}$/)
							.required(),
						buttonText: string()
							.pattern(/^#[0-9A-Fa-f]{6}$/)
							.required(),
						buttonHover: string()
							.pattern(/^#[0-9A-Fa-f]{6}$/)
							.required(),
						buttonSecondary: string()
							.pattern(/^#[0-9A-Fa-f]{6}$/)
							.required(),
						buttonSecondaryText: string()
							.pattern(/^#[0-9A-Fa-f]{6}$/)
							.required(),
						border: string()
							.pattern(/^#[0-9A-Fa-f]{6}$/)
							.required(),
						borderHover: string()
							.pattern(/^#[0-9A-Fa-f]{6}$/)
							.required(),
						success: string()
							.pattern(/^#[0-9A-Fa-f]{6}$/)
							.required(),
						successText: string()
							.pattern(/^#[0-9A-Fa-f]{6}$/)
							.required(),
						warning: string()
							.pattern(/^#[0-9A-Fa-f]{6}$/)
							.required(),
						warningText: string()
							.pattern(/^#[0-9A-Fa-f]{6}$/)
							.required(),
						error: string()
							.pattern(/^#[0-9A-Fa-f]{6}$/)
							.required(),
						errorText: string()
							.pattern(/^#[0-9A-Fa-f]{6}$/)
							.required(),
						card: string()
							.pattern(/^#[0-9A-Fa-f]{6}$/)
							.required(),
						cardBorder: string()
							.pattern(/^#[0-9A-Fa-f]{6}$/)
							.required(),
						shadow: string()
							.pattern(/^rgba\(\d+,\s*\d+,\s*\d+,\s*[0-1]?\.?\d+\)$/)
							.required(),
					}).required(),
				}).required(),
				darkMode: object({
					colors: object({
						primary: string()
							.pattern(/^#[0-9A-Fa-f]{6}$/)
							.required(),
						secondary: string()
							.pattern(/^#[0-9A-Fa-f]{6}$/)
							.required(),
						background: string()
							.pattern(/^#[0-9A-Fa-f]{6}$/)
							.required(),
						backgroundSecondary: string()
							.pattern(/^#[0-9A-Fa-f]{6}$/)
							.required(),
						text: string()
							.pattern(/^#[0-9A-Fa-f]{6}$/)
							.required(),
						textSecondary: string()
							.pattern(/^#[0-9A-Fa-f]{6}$/)
							.required(),
						textMuted: string()
							.pattern(/^#[0-9A-Fa-f]{6}$/)
							.required(),
						header: string()
							.pattern(/^#[0-9A-Fa-f]{6}$/)
							.required(),
						headerText: string()
							.pattern(/^#[0-9A-Fa-f]{6}$/)
							.required(),
						button: string()
							.pattern(/^#[0-9A-Fa-f]{6}$/)
							.required(),
						buttonText: string()
							.pattern(/^#[0-9A-Fa-f]{6}$/)
							.required(),
						buttonHover: string()
							.pattern(/^#[0-9A-Fa-f]{6}$/)
							.required(),
						buttonSecondary: string()
							.pattern(/^#[0-9A-Fa-f]{6}$/)
							.required(),
						buttonSecondaryText: string()
							.pattern(/^#[0-9A-Fa-f]{6}$/)
							.required(),
						border: string()
							.pattern(/^#[0-9A-Fa-f]{6}$/)
							.required(),
						borderHover: string()
							.pattern(/^#[0-9A-Fa-f]{6}$/)
							.required(),
						success: string()
							.pattern(/^#[0-9A-Fa-f]{6}$/)
							.required(),
						successText: string()
							.pattern(/^#[0-9A-Fa-f]{6}$/)
							.required(),
						warning: string()
							.pattern(/^#[0-9A-Fa-f]{6}$/)
							.required(),
						warningText: string()
							.pattern(/^#[0-9A-Fa-f]{6}$/)
							.required(),
						error: string()
							.pattern(/^#[0-9A-Fa-f]{6}$/)
							.required(),
						errorText: string()
							.pattern(/^#[0-9A-Fa-f]{6}$/)
							.required(),
						card: string()
							.pattern(/^#[0-9A-Fa-f]{6}$/)
							.required(),
						cardBorder: string()
							.pattern(/^#[0-9A-Fa-f]{6}$/)
							.required(),
						shadow: string()
							.pattern(/^rgba\(\d+,\s*\d+,\s*\d+,\s*[0-1]?\.?\d+\)$/)
							.required(),
					}).required(),
				}).required(),
			}).required(),
		}).required(),
	},
};

const getThemeValidation = async (ctx, next) => {
	await validate(ctx.query, schemas.getTheme);
	await next();
};

const updateThemeValidation = async (ctx, next) => {
	const payload = Object.assign(ctx.request.query, ctx.request.body);

	const { faceBase64, masterPassword, themeSettings } = payload;

	const valid = validate(schemas.updateTheme, {
		faceBase64,
		masterPassword,
		themeSettings,
	});

	if (valid.error) {
		ctx.status = 409;
		ctx.body = { validationError: valid.error.message };
		return;
	}

	await next();
};

module.exports = {
	getThemeValidation,
	updateThemeValidation,
};
