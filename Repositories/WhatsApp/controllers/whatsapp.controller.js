const Module = require("../modules/whatsapp.module");

/**
 * Relay WhatsApp template send for Verifik (non-GCP egress).
 * @param {object} ctx
 */
const sendMessage = async (ctx) => {
	try {
		const { to, template, language, components, whatsAppIdentifier } = ctx.request.body;

		const data = await Module.sendMessage(
			{ to, template, language, components },
			whatsAppIdentifier || null
		);

		ctx.body = { data };
	} catch (exception) {
		const [status, code] = `${exception.message || exception}`.split(":");

		ctx.status = Number(status) || 409;
		ctx.body = { code: code || "error_sending_whatsapp_message", message: exception.message };
	}
};

module.exports = {
	sendMessage,
};
