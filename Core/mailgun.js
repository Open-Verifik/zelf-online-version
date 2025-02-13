const formData = require("form-data");

const config = require("./config");
const axios = require("axios");
const domain = "mg.zelf.world";

const sendEmail = async (to, subject, template, extraParams = {}) => {
	if (!subject || !template) {
		return null;
	}

	const _to = config.env === "production" ? to : config.email_providers.mailgun.proxyEmail;

	const apiKey = config.email_providers.mailgun.apiKey;

	const formData = new URLSearchParams();
	formData.append("from", "noreply@mg.zelf.world");
	formData.append("to", _to);
	formData.append("subject", subject);
	formData.append("template", template);

	// Handle recipient variables if provided
	if (extraParams["recipient-variables"]) {
		if (config.env === "development") {
			const keys = Object.keys(extraParams["recipient-variables"]);

			for (let index = 0; index < keys.length; index++) {
				const key = keys[index];
				extraParams["recipient-variables"][_to] = extraParams["recipient-variables"][key];
			}
		}

		formData.append("recipient-variables", JSON.stringify(extraParams["recipient-variables"]));
	}

	try {
		if (config.debug.sendEmail) console.log("Email data:", formData.toString());

		const response = await axios.post(`https://api.mailgun.net/v3/${domain}/messages`, formData, {
			auth: {
				username: "api",
				password: apiKey,
			},
			headers: {
				"Content-Type": "application/x-www-form-urlencoded",
			},
		});

		if (config.debug.sendEmail) console.log("Email response:", response.data);

		return response.data;
	} catch (exception) {
		console.error({
			emailException: exception,
			emailData: formData.toString(),
		});

		return null;
	}
};

module.exports = {
	sendEmail,
};
