const formData = require("form-data");
const Mailgun = require("mailgun.js");
const config = require("./config");
const domain = "mg.zelf.world";
const mailgun = new Mailgun(formData);

const mg = mailgun.client({
	username: "api",
	key: config.email_providers.mailgun.apiKey || "key-yourkeyhere",
});

/**
 * send email
 * @param {object} emailData
 */
const sendEmail = async (to, subject, template, extraParams = {}) => {
	if (!subject || !template) {
		return null;
	}

	const _to = config.env === "production" ? to : config.email_providers.mailgun.proxyEmail;

	const emailData = {
		from: "Zelf Name Service <noreply@mg.zelf.world>>",
		to: _to,
		subject,
		template,
	};

	if (extraParams["recipient-variables"]) {
		if (config.env === "development") {
			const keys = Object.keys(extraParams["recipient-variables"]);

			for (let index = 0; index < keys.length; index++) {
				const key = keys[index];

				extraParams["recipient-variables"][_to] = extraParams["recipient-variables"][key];
			}
		}

		emailData["recipient-variables"] = JSON.stringify(extraParams["recipient-variables"]);
	}

	try {
		if (config.debug.sendEmail) console.log("emailData", emailData);

		const response = await new Promise((resolve, reject) => {
			mg.messages.create(domain, emailData).then((emailResponse) => {
				if (config.debug.sendEmail) console.log("emailResponse", emailResponse);

				resolve(emailResponse);
			});
		});

		return response;
	} catch (exception) {
		console.error({
			emailException: exception,
		});

		return null;
	}
};

module.exports = {
	sendEmail,
};
