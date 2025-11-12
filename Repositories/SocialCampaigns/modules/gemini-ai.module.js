const axios = require("axios");
const path = require("path");
const fs = require("fs");
const jwt = require("jsonwebtoken");
const config = require("../../../Core/config");

/**
 * Google Gemini AI integration for image analysis
 * Validates screenshots to verify social media follows
 * Supports two authentication methods:
 * 1. API Key (simpler, for testing)
 * 2. Service Account (more secure, for production)
 */

// Authentication mode: 'api_key' or 'service_account'
// Can be set via environment variable GEMINI_AUTH_MODE or config.google.geminiAuthMode
// Defaults to 'api_key' if API key is provided, otherwise 'service_account'
const getAuthMode = () => {
	const envMode = process.env.GEMINI_AUTH_MODE || config.google?.geminiAuthMode;
	if (envMode === "api_key" || envMode === "service_account") {
		return envMode;
	}

	// Auto-detect: if API key is available, use it; otherwise use service account
	const apiKey = config.google?.geminiApiKey || process.env.GEMINI_API_KEY;
	return apiKey ? "api_key" : "service_account";
};

// Cache for access token (valid for 1 hour)
let tokenCache = {
	token: null,
	expiresAt: 0,
};

/**
 * Get API key from config or environment
 * @returns {string|null} API key or null if not found
 */
const getApiKey = () => {
	return config.google?.geminiApiKey || process.env.GEMINI_API_KEY || null;
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

		// Load service account key file
		const keyPath = path.resolve(__dirname, "../../../config/google_key.json");
		const keyFile = JSON.parse(fs.readFileSync(keyPath, "utf8"));

		// Create JWT for service account
		const nowSeconds = Math.floor(now / 1000);
		const jwtPayload = {
			iss: keyFile.client_email,
			sub: keyFile.client_email,
			aud: "https://oauth2.googleapis.com/token",
			iat: nowSeconds,
			exp: nowSeconds + 3600, // Token expires in 1 hour
			scope: "https://www.googleapis.com/auth/cloud-platform",
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
 * Analyze image using Google Gemini AI
 * @param {string} base64Image - Base64 encoded image (with or without data URL prefix)
 * @param {string} platform - Platform name ('x' or 'linkedin')
 * @param {Array} accounts - Array of account objects to check for
 * @returns {Promise<Object>} Analysis result with actionCompleted boolean
 */
const analyzeImageWithGemini = async (base64Image, platform, accounts) => {
	try {
		const authMode = getAuthMode();

		let apiKey = null;

		let accessToken = null;

		// Authenticate based on mode
		if (authMode === "api_key") {
			apiKey = getApiKey();
			if (!apiKey) {
				throw new Error("Gemini API key not configured. Set GEMINI_API_KEY or config.google.geminiApiKey");
			}
		} else {
			accessToken = await getServiceAccountToken();
			if (!accessToken) {
				throw new Error("Failed to obtain access token from service account");
			}
		}

		// Clean base64 image (remove data URL prefix if present)
		const cleanBase64 = base64Image.replace(/^data:image\/[a-z]+;base64,/, "");

		// Build prompt based on platform
		const platformName = platform === "x" ? "X (Twitter)" : "LinkedIn";
		const accountUsernames = accounts.map((acc) => acc.username || acc.displayName).join(", ");

		const prompt = `Analyze this ${platformName} screenshot and determine if the user is following the required account(s).

Required accounts to check: ${accountUsernames}

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

		// Gemini API endpoint
		let geminiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent`;
		const headers = {
			"Content-Type": "application/json",
		};
		const params = {};

		// Set authentication based on mode
		if (authMode === "api_key") {
			params.key = apiKey;
		} else {
			headers.Authorization = `Bearer ${accessToken}`;
			params.alt = "json";
		}

		// Prepare request payload
		const payload = {
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
			generationConfig: {
				temperature: 0.1,
				topK: 32,
				topP: 1,
				maxOutputTokens: 1024,
				responseMimeType: "application/json",
			},
		};

		// Make API request
		const response = await axios.post(geminiUrl, payload, {
			headers,
			params,
		});

		// Extract response text
		const responseText = response.data?.candidates?.[0]?.content?.parts?.[0]?.text;

		if (!responseText) {
			throw new Error("No response from Gemini API");
		}

		// Parse JSON response
		let result;
		try {
			result = JSON.parse(responseText);
		} catch (parseError) {
			// Try to extract JSON from markdown code blocks if present
			const jsonMatch = responseText.match(/```json\s*([\s\S]*?)\s*```/) || responseText.match(/```\s*([\s\S]*?)\s*```/);
			if (jsonMatch) {
				result = JSON.parse(jsonMatch[1]);
			} else {
				throw parseError;
			}
		}

		// Validate response structure
		if (typeof result.actionCompleted !== "boolean") {
			throw new Error("Invalid response format from Gemini API");
		}

		return {
			actionCompleted: result.actionCompleted,
			confidence: result.confidence || 0.5,
			reason: result.reason || "Analysis completed",
		};
	} catch (error) {
		console.error("Error analyzing image with Gemini:", error);

		// If it's an axios error, log more details
		if (error.response) {
			console.error("Gemini API Error Response:", {
				status: error.response.status,
				data: error.response.data,
			});
		}

		throw new Error(`Failed to analyze image: ${error.message}`);
	}
};

module.exports = {
	analyzeImageWithGemini,
};
