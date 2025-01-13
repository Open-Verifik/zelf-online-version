const { RecaptchaEnterpriseServiceClient } = require("@google-cloud/recaptcha-enterprise");
const config = require("./config");

const PROJECT_ID = config.google.captchaProjectID;
const WEB_SITE_KEY = config.google.webSiteKey;
const ANDROID_SITE_KEY = config.google.androidSiteKey;
const IOS_SITE_KEY = config.google.iOSSiteKey;
/**
 * Create an assessment to analyze the risk of a UI action.
 *
 * projectID: Your Google Cloud Project ID.
 * recaptchaSiteKey: The reCAPTCHA key associated with the site/app
 * token: The generated token obtained from the client.
 * recaptchaAction: Action name corresponding to the token.
 */
const createAssessment = async (token, os = "DESKTOP", recaptchaAction = "action-name") => {
	const OSMapping = {
		DESKTOP: WEB_SITE_KEY,
		ANDROID: ANDROID_SITE_KEY,
		IOS: IOS_SITE_KEY,
	};

	const client = new RecaptchaEnterpriseServiceClient();

	const projectPath = client.projectPath(PROJECT_ID);

	// Build the assessment request.
	const request = {
		assessment: {
			event: {
				token: token,
				siteKey: OSMapping[os] || WEB_SITE_KEY,
			},
		},
		parent: projectPath,
	};

	const [response] = await client.createAssessment(request);

	// Check if the token is valid.
	if (!response.tokenProperties.valid) {
		console.log(`The CreateAssessment call failed because the token was: ${response.tokenProperties.invalidReason}`, {
			tokenProperties: response.tokenProperties,
		});

		return config.env === "development" ? 1 : 0;
	}

	// Check if the expected action was executed.
	// The `action` property is set by user client in the grecaptcha.enterprise.execute() method.
	if (response.tokenProperties.action === recaptchaAction) {
		// Get the risk score and the reason(s).
		// For more information on interpreting the assessment, see:
		// https://cloud.google.com/recaptcha-enterprise/docs/interpret-assessment
		// console.log(`The reCAPTCHA score is: ${response.riskAnalysis.score}`);

		response.riskAnalysis.reasons.forEach((reason) => {
			console.log(reason);
		});

		return Boolean(config.env === "development" ? 1 : response.riskAnalysis.score || 0);
	}

	return 0;
};

module.exports = {
	createAssessment,
};
