const axios = require("axios");

const config = require("../../../Core/config");

const TRANSIENT_RETRY_DELAYS_MS = [1000, 3000, 5000];

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

const createWhatsAppAxios = (apiKey) => {
	const axiosInstance = axios.create({
		baseURL: "https://graph.facebook.com/v22.0",
	});

	axiosInstance.defaults.headers.common["Content-Type"] = "application/json";
	axiosInstance.defaults.headers.common["Authorization"] = `Bearer ${apiKey || config.whatsApp.apiKeys.default}`;

	return axiosInstance;
};

const maskPhone = (phone) => {
	if (!phone || phone.length < 4) return phone;

	return `${phone.slice(0, -4).replace(/\d/g, "*")}${phone.slice(-4)}`;
};

const logWhatsAppError = (metaError, attempt, context = {}) => {
	if (!metaError) {
		console.error({ whatsappError: { message: "Unknown WhatsApp API error", attempt, ...context } });
		return;
	}

	console.error({
		whatsappError: {
			code: metaError.code,
			errorSubcode: metaError.error_subcode,
			message: metaError.message,
			type: metaError.type,
			isTransient: metaError.is_transient,
			fbtraceId: metaError.fbtrace_id,
			attempt,
			...context,
		},
	});
};

const isTransientWhatsAppError = (metaError) => Boolean(metaError?.is_transient || metaError?.code === 2);

const postWhatsAppMessage = async (axiosInstance, identifier, dataToSend) => {
	return axiosInstance.post(`/${identifier}/messages`, dataToSend);
};

/**
 * Send a WhatsApp template message via Meta Graph API.
 * @param {Object} data
 * @param {string|null} whatsAppIdentifier
 */
const sendMessage = async (data, whatsAppIdentifier = null) => {
	const { template, language, to, components } = data;

	if (!template) throw new Error("403:only_template_allowed_for_now");

	const recipient = `${to}`.replace(/\D/g, "");
	const apiKey =
		whatsAppIdentifier && config.whatsApp.apiKeys[whatsAppIdentifier]
			? config.whatsApp.apiKeys[whatsAppIdentifier]
			: config.whatsApp.apiKeys.default;
	const axiosInstance = createWhatsAppAxios(apiKey);
	const identifier = whatsAppIdentifier || config.whatsApp.phoneIdentifier;

	const dataToSend = {
		messaging_product: "whatsapp",
		to: recipient,
		type: "template",
		template: {
			name: template,
			language: {
				code: ["en", "es"].includes(language) ? language : "en",
			},
			components: components,
		},
	};

	const errorContext = {
		template,
		phoneIdentifier: identifier,
		recipient: maskPhone(recipient),
	};

	const maxAttempts = TRANSIENT_RETRY_DELAYS_MS.length + 1;

	for (let attempt = 1; attempt <= maxAttempts; attempt++) {
		try {
			const response = await postWhatsAppMessage(axiosInstance, identifier, dataToSend);

			return response ? response.data : null;
		} catch (exception) {
			const metaError = exception?.response?.data?.error;

			logWhatsAppError(metaError, attempt, errorContext);

			const shouldRetry = isTransientWhatsAppError(metaError) && attempt < maxAttempts;

			if (!shouldRetry) break;

			await sleep(TRANSIENT_RETRY_DELAYS_MS[attempt - 1]);
		}
	}

	throw new Error("409:error_sending_whatsapp_message");
};

module.exports = {
	sendMessage,
};
