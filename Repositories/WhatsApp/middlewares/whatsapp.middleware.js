const config = require("../../../Core/config");

const { string, array, validate, stringEnum } = require("../../../Core/JoiUtils");

const schemas = {
	sendMessage: {
		to: string().required(),
		template: string().required(),
		language: stringEnum(["en", "es"]).default("es"),
		components: array().required(),
		whatsAppIdentifier: string().allow(null).optional(),
	},
};

/**
 * Validates shared relay API key from Verifik.
 * @param {object} ctx
 * @param {Function} next
 */
const relayApiKeyValidation = async (ctx, next) => {
	const apiKey = ctx.headers["x-api-key"];

	if (!apiKey || !config.whatsApp.relayApiKey || apiKey !== config.whatsApp.relayApiKey) {
		ctx.status = 401;
		ctx.body = { error: "Unauthorized" };
		return;
	}

	await next();
};

/**
 * Validates WhatsApp send payload.
 * @param {object} ctx
 * @param {Function} next
 */
const sendMessageValidation = async (ctx, next) => {
	const valid = validate(schemas.sendMessage, ctx.request.body);

	if (valid.error) {
		ctx.status = 409;
		ctx.body = { validationError: valid.error.message };
		return;
	}

	ctx.request.body = valid.value;
	await next();
};

module.exports = {
	relayApiKeyValidation,
	sendMessageValidation,
};
