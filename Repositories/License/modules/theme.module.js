const LicenseModule = require("./license.module");
const IPFS = require("../../../Repositories/IPFS/modules/ipfs.module");
const TagsIPFSModule = require("../../Tags/modules/tags-ipfs.module");
const moment = require("moment");

/**
 * Get user's theme settings
 * @param {Object} user - User object
 * @returns {Object} - Theme settings
 */
const getThemeSettings = async (user) => {
	try {
		const { myLicense } = await LicenseModule.getMyLicense(user, true);

		if (!myLicense) throw new Error("404:license_not_found");

		// Get theme settings from license metadata
		const themeSettings = myLicense.domainConfig?.themeSettings || getDefaultThemeSettings();

		return themeSettings;
	} catch (error) {
		console.error("Get theme settings error:", error);
		throw error;
	}
};

/**
 * Deep merge utility function
 * @param {Object} target - Target object to merge into
 * @param {Object} source - Source object to merge from
 * @returns {Object} - Merged object
 */
const deepMerge = (target, source) => {
	if (!source || typeof source !== "object") return target;
	if (!target || typeof target !== "object") return source;

	const result = { ...target };

	for (const key in source) {
		if (source.hasOwnProperty(key)) {
			if (
				source[key] &&
				typeof source[key] === "object" &&
				!Array.isArray(source[key]) &&
				target[key] &&
				typeof target[key] === "object" &&
				!Array.isArray(target[key])
			) {
				result[key] = deepMerge(target[key], source[key]);
			} else {
				result[key] = source[key];
			}
		}
	}

	return result;
};

/**
 * Update user's theme settings
 * @param {Object} requestData - Request data with biometric verification
 * @param {Object} user - User object
 * @returns {Object} - Updated theme settings
 */
const updateThemeSettings = async (requestData, user) => {
	try {
		const { faceBase64, masterPassword, themeSettings } = requestData;

		const { myLicense } = await LicenseModule.getMyLicense(user, true, { faceBase64, masterPassword });

		if (!myLicense || !myLicense.publicData || !myLicense.domainConfig) throw new Error("404:license_not_found");

		// Get existing theme settings or default
		const existingThemeSettings = myLicense.domainConfig.themeSettings || getDefaultThemeSettings();

		// Deep merge new theme settings with existing ones to preserve partial updates
		const mergedThemeSettings = deepMerge(existingThemeSettings, themeSettings || {});

		// Update theme settings in domain config
		const updatedDomainConfig = {
			...myLicense.domainConfig,
			themeSettings: mergedThemeSettings,
			updatedAt: moment().format("YYYY-MM-DD HH:mm:ss"),
		};

		// Create new license file with updated theme settings
		const jsonData = JSON.stringify(updatedDomainConfig, null, 2);

		const base64Data = Buffer.from(jsonData).toString("base64");

		const updatedLicense = await IPFS.insert(
			{
				base64: base64Data,
				metadata: {
					type: "license",
					licenseType: myLicense.publicData.type || "custom",
					licenseSubscriptionId: myLicense.publicData.subscriptionId || "free",
					licenseDomain: updatedDomainConfig.name,
					licenseOwner: user.email,
				},
				name: `${updatedDomainConfig.name}.license`,
				pinIt: true,
			},
			{ pro: true }
		);

		// Unpin old license file
		await TagsIPFSModule.unPinFiles([myLicense.id]);

		return {
			ipfs: updatedLicense,
			themeSettings: mergedThemeSettings,
		};
	} catch (error) {
		console.error("Update theme settings error:", error);

		throw error;
	}
};

/**
 * Get default theme settings
 * @returns {Object} - Default theme settings
 */
const getDefaultThemeSettings = () => {
	return {
		zns: {
			enabled: true,
			currentMode: "light",
			lightMode: {
				colors: {
					primary: "#3B82F6",
					secondary: "#64748B",
					background: "#FFFFFF",
					backgroundSecondary: "#F8FAFC",
					text: "#1E293B",
					textSecondary: "#64748B",
					textMuted: "#94A3B8",
					header: "#1E293B",
					headerText: "#FFFFFF",
					button: "#3B82F6",
					buttonText: "#FFFFFF",
					buttonHover: "#2563EB",
					buttonSecondary: "#E2E8F0",
					buttonSecondaryText: "#475569",
					border: "#E2E8F0",
					borderHover: "#CBD5E1",
					success: "#10B981",
					successText: "#FFFFFF",
					warning: "#F59E0B",
					warningText: "#FFFFFF",
					error: "#EF4444",
					errorText: "#FFFFFF",
					card: "#FFFFFF",
					cardBorder: "#E2E8F0",
					shadow: "rgba(0, 0, 0, 0.1)",
				},
			},
			darkMode: {
				colors: {
					primary: "#60A5FA",
					secondary: "#94A3B8",
					background: "#0F172A",
					backgroundSecondary: "#1E293B",
					text: "#F1F5F9",
					textSecondary: "#94A3B8",
					textMuted: "#64748B",
					header: "#1E293B",
					headerText: "#F1F5F9",
					button: "#60A5FA",
					buttonText: "#0F172A",
					buttonHover: "#3B82F6",
					buttonSecondary: "#334155",
					buttonSecondaryText: "#F1F5F9",
					border: "#334155",
					borderHover: "#475569",
					success: "#34D399",
					successText: "#0F172A",
					warning: "#FBBF24",
					warningText: "#0F172A",
					error: "#F87171",
					errorText: "#0F172A",
					card: "#1E293B",
					cardBorder: "#334155",
					shadow: "rgba(0, 0, 0, 0.3)",
				},
			},
		},
		zelfkeys: {
			enabled: true,
			currentMode: "light",
			lightMode: {
				colors: {
					primary: "#8B5CF6",
					secondary: "#64748B",
					background: "#FFFFFF",
					backgroundSecondary: "#F8FAFC",
					text: "#1E293B",
					textSecondary: "#64748B",
					textMuted: "#94A3B8",
					header: "#1E293B",
					headerText: "#FFFFFF",
					button: "#8B5CF6",
					buttonText: "#FFFFFF",
					buttonHover: "#7C3AED",
					buttonSecondary: "#E2E8F0",
					buttonSecondaryText: "#475569",
					border: "#E2E8F0",
					borderHover: "#CBD5E1",
					success: "#10B981",
					successText: "#FFFFFF",
					warning: "#F59E0B",
					warningText: "#FFFFFF",
					error: "#EF4444",
					errorText: "#FFFFFF",
					card: "#FFFFFF",
					cardBorder: "#E2E8F0",
					shadow: "rgba(0, 0, 0, 0.1)",
				},
			},
			darkMode: {
				colors: {
					primary: "#A78BFA",
					secondary: "#94A3B8",
					background: "#0F172A",
					backgroundSecondary: "#1E293B",
					text: "#F1F5F9",
					textSecondary: "#94A3B8",
					textMuted: "#64748B",
					header: "#1E293B",
					headerText: "#F1F5F9",
					button: "#A78BFA",
					buttonText: "#0F172A",
					buttonHover: "#8B5CF6",
					buttonSecondary: "#334155",
					buttonSecondaryText: "#F1F5F9",
					border: "#334155",
					borderHover: "#475569",
					success: "#34D399",
					successText: "#0F172A",
					warning: "#FBBF24",
					warningText: "#0F172A",
					error: "#F87171",
					errorText: "#0F172A",
					card: "#1E293B",
					cardBorder: "#334155",
					shadow: "rgba(0, 0, 0, 0.3)",
				},
			},
		},
	};
};

module.exports = {
	getThemeSettings,
	updateThemeSettings,
	getDefaultThemeSettings,
};
