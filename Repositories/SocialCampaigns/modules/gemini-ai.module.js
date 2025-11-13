const axios = require("axios");
const path = require("path");
const fs = require("fs");
const jwt = require("jsonwebtoken");

/**
 * Google Gemini AI integration for image analysis
 * Validates screenshots to verify social media follows
 * Uses service account authentication from gemini_key.json
 */

// Cache for access token (valid for 1 hour)
let tokenCache = {
	token: null,
	expiresAt: 0,
};

/**
 * List available Gemini models
 * @returns {Promise<Array>} List of available models
 */
const listAvailableModels = async () => {
	try {
		const accessToken = await getServiceAccountToken();
		if (!accessToken) {
			throw new Error("Failed to obtain access token from service account");
		}

		// Try both API versions
		const apiVersions = ["v1", "v1beta"];
		const headers = {
			"Content-Type": "application/json",
			Authorization: `Bearer ${accessToken}`,
		};

		for (const apiVersion of apiVersions) {
			try {
				const listUrl = `https://generativelanguage.googleapis.com/${apiVersion}/models`;

				const response = await axios.get(listUrl, {
					headers,
				});

				return response.data?.models || [];
			} catch (error) {
				if (apiVersions.indexOf(apiVersion) < apiVersions.length - 1) {
					console.log(`API version ${apiVersion} failed, trying next...`);
					continue;
				}
				throw error;
			}
		}

		return [];
	} catch (error) {
		console.error("Error listing models:", error);
		throw new Error(`Failed to list models: ${error.message}`);
	}
};

/**
 * Get access token using service account credentials
 * Uses caching to avoid requesting new token on every call
 * @returns {Promise<string>} Access token
 */
const getServiceAccountToken = async () => {
	try {
		// Check if cached token is still valid (with 5 minute buffer)
		const now = Date.now();
		if (tokenCache.token && tokenCache.expiresAt > now + 5 * 60 * 1000) {
			return tokenCache.token;
		}

		// Load service account key file (prefer gemini_key.json, fallback to google_key.json)
		const geminiKeyPath = path.resolve(__dirname, "../../../config/gemini_key.json");
		const googleKeyPath = path.resolve(__dirname, "../../../config/google_key.json");

		let keyPath = null;
		if (fs.existsSync(geminiKeyPath)) {
			keyPath = geminiKeyPath;
		} else if (fs.existsSync(googleKeyPath)) {
			keyPath = googleKeyPath;
		} else {
			throw new Error("Service account key file not found. Expected gemini_key.json or google_key.json in config directory");
		}

		const keyFile = JSON.parse(fs.readFileSync(keyPath, "utf8"));

		// Create JWT for service account
		const nowSeconds = Math.floor(now / 1000);
		const jwtPayload = {
			iss: keyFile.client_email,
			sub: keyFile.client_email,
			aud: "https://oauth2.googleapis.com/token",
			iat: nowSeconds,
			exp: nowSeconds + 3600, // Token expires in 1 hour
			// Use Gemini-specific scope for Generative Language API
			scope: "https://www.googleapis.com/auth/generative-language",
		};

		// Sign JWT with private key
		const signedJWT = jwt.sign(jwtPayload, keyFile.private_key, { algorithm: "RS256" });

		// Exchange JWT for access token
		const tokenResponse = await axios.post("https://oauth2.googleapis.com/token", null, {
			params: {
				grant_type: "urn:ietf:params:oauth:grant-type:jwt-bearer",
				assertion: signedJWT,
			},
		});

		const accessToken = tokenResponse.data.access_token;
		const expiresIn = tokenResponse.data.expires_in || 3600; // Default to 1 hour

		// Cache the token
		tokenCache = {
			token: accessToken,
			expiresAt: now + expiresIn * 1000,
		};

		return accessToken;
	} catch (error) {
		console.error("Error getting access token:", error);
		throw new Error(`Failed to authenticate with Google service account: ${error.message}`);
	}
};

/**
 * Clean base64 image string by removing data URL prefix if present
 * @param {string} base64Image - Base64 encoded image (with or without data URL prefix)
 * @returns {string} Clean base64 string
 */
const cleanBase64Image = (base64Image) => {
	return base64Image.replace(/^data:image\/[a-z]+;base64,/, "");
};

/**
 * Build validation prompt for Gemini AI based on platform and accounts
 * @param {string} platform - Platform name ('x' or 'linkedin')
 * @param {Array} accounts - Array of account objects to check for
 * @returns {string} Formatted prompt string
 */
const buildValidationPrompt = (platform, accounts) => {
	const platformName = platform === "x" ? "X (Twitter)" : "LinkedIn";
	const accountNames = accounts.map((acc) => acc.displayName || acc.username || acc.companyName).join(", ");
	const accountUsernames = accounts.map((acc) => acc.username || acc.displayName).join(", ");

	if (platform === "linkedin") {
		return `Analyze this LinkedIn screenshot and determine if the user is following the required profile(s).

Required profiles to check: ${accountNames}
Profile usernames/URLs: ${accountUsernames}

Look for visual indicators that show the user is following these profiles, such as:
- A "Following" button (with a checkmark) visible in the screenshot
- The button should clearly show "Following" status (not "Follow" or "Connect")
- Profile name "${accountNames}" visible in the screenshot
- Profile picture matching the required account

IMPORTANT: The screenshot must clearly show a "Following" button/status. If you see "Follow" or "Connect" buttons instead, the user is NOT following.

Return ONLY a valid JSON object with this exact structure:
{
  "actionCompleted": true or false,
  "confidence": 0.0 to 1.0,
  "reason": "brief explanation"
}

Be strict - only return actionCompleted: true if you can clearly see a "Following" button/status indicating the user is following at least one of the required profiles.`;
	}

	// X (Twitter) validation prompt
	return `Analyze this X (Twitter) screenshot and determine if the user is following the required account(s).

Required accounts to check: ${accountNames}
Account usernames: ${accountUsernames}

Look for visual indicators that show the user is following these accounts, such as:
- "Following" button or status
- Account names/usernames visible in the screenshot
- Profile information matching the required accounts

Return ONLY a valid JSON object with this exact structure:
{
  "actionCompleted": true or false,
  "confidence": 0.0 to 1.0,
  "reason": "brief explanation"
}

Be strict - only return actionCompleted: true if you can clearly see evidence that the user is following at least one of the required accounts.`;
};

/**
 * Get list of Gemini models to try, ordered by preference (cheapest first)
 * @returns {Array<string>} Array of model names
 */
const getModelNames = () => {
	return [
		"gemini-2.5-flash", // Latest Flash model (cheapest, best for image analysis)
		"gemini-2.0-flash-001", // Stable Flash model
		"gemini-2.0-flash-lite-001", // Even cheaper Flash-Lite
		"gemini-1.5-flash", // Older Flash model (fallback)
		"gemini-1.5-pro", // Pro model (more expensive, fallback)
	];
};

/**
 * Create request headers for Gemini API
 * @param {string} accessToken - Service account access token
 * @returns {Object} Headers object
 */
const createGeminiHeaders = (accessToken) => {
	return {
		"Content-Type": "application/json",
		Authorization: `Bearer ${accessToken}`,
	};
};

/**
 * Create generation config for Gemini API request
 * @returns {Object} Generation config object
 */
const createGenerationConfig = () => {
	return {
		temperature: 0.1,
		topK: 32,
		topP: 1,
		maxOutputTokens: 1024,
	};
};

/**
 * Create payload for Gemini API request
 * @param {string} prompt - Validation prompt
 * @param {string} cleanBase64 - Clean base64 image data
 * @returns {Object} Request payload object
 */
const createGeminiPayload = (prompt, cleanBase64) => {
	return {
		contents: [
			{
				parts: [
					{
						text: prompt,
					},
					{
						inline_data: {
							mime_type: "image/jpeg",
							data: cleanBase64,
						},
					},
				],
			},
		],
		generationConfig: createGenerationConfig(),
	};
};

/**
 * Try multiple Gemini models until one succeeds
 * @param {Array<string>} modelNames - Array of model names to try
 * @param {string} apiVersion - API version ('v1' or 'v1beta')
 * @param {Object} payload - Request payload
 * @param {Object} headers - Request headers
 * @returns {Promise<Object>} Axios response object
 */
const tryGeminiModels = async (modelNames, apiVersion, payload, headers) => {
	let lastError;

	for (const modelName of modelNames) {
		try {
			const geminiUrl = `https://generativelanguage.googleapis.com/${apiVersion}/models/${modelName}:generateContent`;
			const response = await axios.post(geminiUrl, payload, { headers });
			return response;
		} catch (error) {
			lastError = error;
			// If it's a 404 (model not found), try next model
			const isLastModel = modelNames.indexOf(modelName) === modelNames.length - 1;
			if (error.response?.status === 404 && !isLastModel) {
				console.log(`Model ${modelName} not found, trying next model...`);
				continue;
			}
			// For other errors or last model, throw the error
			throw error;
		}
	}

	throw lastError || new Error("500:failed_to_find_working_gemini_model");
};

/**
 * Extract and parse response text from Gemini API response
 * @param {Object} response - Axios response object
 * @returns {Object} Parsed JSON result
 */
const parseGeminiResponse = (response) => {
	const responseText = response.data?.candidates?.[0]?.content?.parts?.[0]?.text;

	if (!responseText) throw new Error("500:no_response_from_gemini_api");

	// Try to parse JSON directly
	try {
		return JSON.parse(responseText);
	} catch (parseError) {
		// Try to extract JSON from markdown code blocks if present
		const jsonMatch = responseText.match(/```json\s*([\s\S]*?)\s*```/) || responseText.match(/```\s*([\s\S]*?)\s*```/);
		if (jsonMatch) {
			return JSON.parse(jsonMatch[1]);
		}

		throw parseError;
	}
};

/**
 * Validate and format Gemini API response
 * @param {Object} result - Parsed JSON result from Gemini
 * @returns {Object} Formatted result with actionCompleted, confidence, and reason
 */
const validateAndFormatResult = (result) => {
	if (typeof result.actionCompleted !== "boolean") throw new Error("500:invalid_response_format_from_gemini_api");

	return {
		actionCompleted: result.actionCompleted,
		confidence: result.confidence || 0.5,
		reason: result.reason || "Analysis completed",
	};
};

/**
 * Log error details for debugging
 * @param {Error} error - Error object
 */
const logGeminiError = (error) => {
	console.error("Error analyzing image with Gemini:", error);

	if (error.response) {
		console.error("Gemini API Error Response:", {
			status: error.response.status,
			data: error.response.data,
		});
	}
};

/**
 * Analyze image using Google Gemini AI
 * @param {string} base64Image - Base64 encoded image (with or without data URL prefix)
 * @param {string} platform - Platform name ('x' or 'linkedin')
 * @param {Array} accounts - Array of account objects to check for
 * @returns {Promise<Object>} Analysis result with actionCompleted boolean
 */
const analyzeImageWithGemini = async (base64Image, platform, accounts) => {
	try {
		// Authenticate and get access token
		const accessToken = await getServiceAccountToken();
		if (!accessToken) {
			throw new Error("Failed to obtain access token from service account");
		}

		// Prepare image and prompt
		const cleanBase64 = cleanBase64Image(base64Image);
		const prompt = buildValidationPrompt(platform, accounts);

		// Configure API request
		const apiVersion = "v1";
		const modelNames = getModelNames();
		const headers = createGeminiHeaders(accessToken);
		const payload = createGeminiPayload(prompt, cleanBase64);

		// Make API request (try multiple models if needed)
		const response = await tryGeminiModels(modelNames, apiVersion, payload, headers);

		// Parse and validate response
		const result = parseGeminiResponse(response);
		return validateAndFormatResult(result);
	} catch (error) {
		logGeminiError(error);
		throw new Error(`Failed to analyze image: ${error.message}`);
	}
};

module.exports = {
	analyzeImageWithGemini,
	listAvailableModels,
};
