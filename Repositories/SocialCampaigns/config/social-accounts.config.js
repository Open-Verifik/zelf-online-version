/**
 * Configuration for social media accounts that users need to follow
 * Used for validation of X (Twitter) and LinkedIn follows
 */
module.exports = {
	x: {
		// X (Twitter) accounts that users need to follow
		accounts: [
			{
				username: "@zelfworld",
				displayName: "Zelf World",
				description: "Official Zelf World account",
			},
			// Add more X accounts here as needed
		],
		// Validation criteria
		criteria: {
			// Minimum one account must be followed
			minFollows: 1,
			// Keywords to look for in screenshot
			keywords: ["Follow", "Following", "@zelfworld"],
		},
	},
	linkedin: {
		// LinkedIn accounts/companies that users need to follow
		accounts: [
			{
				username: "zelf-world",
				displayName: "Zelf World",
				companyName: "Zelf World",
				description: "Official Zelf World LinkedIn company page",
			},
			// Add more LinkedIn accounts here as needed
		],
		// Validation criteria
		criteria: {
			// Minimum one account must be followed
			minFollows: 1,
			// Keywords to look for in screenshot
			keywords: ["Follow", "Following", "Zelf World"],
		},
	},
};

