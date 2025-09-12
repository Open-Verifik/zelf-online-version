const TagsSearchModule = require("./tags-search.module");
const { 
	getDomainConfiguration, 
	isDomainSupported, 
	isDomainActive,
	getDomainLimits,
	supportsFeature 
} = require("./domain-registry.module");

/**
 * Tags Availability Module
 * 
 * This module handles availability checking for the Tags system.
 * It checks if tag names are available, domain status, and user limits.
 */

/**
 * Check if a tag name is available
 * @param {string} tagName - Full tag name (e.g., "username.avax")
 * @param {Object} authUser - Authenticated user
 * @returns {Object} - Availability result
 */
const checkTagAvailability = async (tagName, authUser) => {
	try {
		// Extract domain and name from tagName
		const parts = tagName.split(".");
		if (parts.length < 2) {
			return { 
				available: false, 
				error: "Invalid tag name format. Must include domain (e.g., username.avax)" 
			};
		}

		const domain = parts[parts.length - 1].toLowerCase();
		const name = parts.slice(0, -1).join(".");

		// Check if domain is supported
		if (!isDomainSupported(domain)) {
			return { 
				available: false, 
				error: `Domain '${domain}' is not supported` 
			};
		}

		// Check if domain is active
		if (!isDomainActive(domain)) {
			return { 
				available: false, 
				error: `Domain '${domain}' is not active` 
			};
		}

		// Search for existing tag
		const searchResult = await TagsSearchModule.searchTag({
			tagName: `${name}.${domain}`,
			domain
		}, authUser);

		// Check if tag is available
		if (searchResult.available === false) {
			return {
				available: false,
				error: `Tag '${tagName}' is already taken`,
				domain,
				name,
				tagName: `${name}.${domain}`
			};
		}

		// Check hold domain availability
		const holdResult = await checkHoldDomainAvailability(domain, name, authUser);
		if (!holdResult.available) {
			return {
				available: false,
				error: `Hold domain for '${tagName}' is not available`,
				domain,
				name,
				tagName: `${name}.${domain}`,
				holdDomain: holdResult.holdDomain
			};
		}

		return {
			available: true,
			domain,
			name,
			tagName: `${name}.${domain}`,
			holdDomain: holdResult.holdDomain
		};

	} catch (error) {
		console.error("Error checking tag availability:", error);
		return {
			available: false,
			error: error.message,
			tagName
		};
	}
};

/**
 * Check if a hold domain is available
 * @param {string} domain - Domain name
 * @param {string} name - Tag name without domain
 * @param {Object} authUser - Authenticated user
 * @returns {Object} - Hold domain availability result
 */
const checkHoldDomainAvailability = async (domain, name, authUser) => {
	try {
		// Get domain configuration
		const domainConfig = getDomainConfiguration(domain);
		if (!domainConfig) {
			return { 
				available: false, 
				error: `Domain '${domain}' is not supported` 
			};
		}

		// Check if domain supports hold functionality
		if (!domainConfig.holdSuffix) {
			return { 
				available: true, 
				holdDomain: null,
				message: "Domain does not support hold functionality" 
			};
		}

		// Generate hold domain name
		const holdDomain = `${name}${domainConfig.holdSuffix}.${domain}`;

		// Search for existing hold domain
		const searchResult = await TagsSearchModule.searchHoldDomain({
			domain,
			name
		}, authUser);

		// Check if hold domain is available
		if (searchResult.available === false) {
			return {
				available: false,
				error: `Hold domain '${holdDomain}' is already taken`,
				holdDomain
			};
		}

		return {
			available: true,
			holdDomain
		};

	} catch (error) {
		console.error("Error checking hold domain availability:", error);
		return {
			available: false,
			error: error.message,
			holdDomain: `${name}${domainConfig?.holdSuffix || ".hold"}.${domain}`
		};
	}
};

/**
 * Check domain availability and status
 * @param {string} domain - Domain name
 * @param {Object} authUser - Authenticated user
 * @returns {Object} - Domain availability result
 */
const checkDomainAvailability = async (domain, authUser) => {
	try {
		// Check if domain is supported
		if (!isDomainSupported(domain)) {
			return {
				available: false,
				error: `Domain '${domain}' is not supported`,
				domain
			};
		}

		// Check if domain is active
		if (!isDomainActive(domain)) {
			return {
				available: false,
				error: `Domain '${domain}' is not active`,
				domain
			};
		}

		// Get domain configuration
		const domainConfig = getDomainConfiguration(domain);
		if (!domainConfig) {
			return {
				available: false,
				error: `Domain '${domain}' configuration not found`,
				domain
			};
		}

		// Check user access
		if (domainConfig.type === "enterprise" && !authUser.enterpriseAccess) {
			return {
				available: false,
				error: "Enterprise access required for this domain",
				domain
			};
		}

		// Check user limits
		const limits = getDomainLimits(domain);
		if (limits.maxTagsPerUser && authUser.tagCount >= limits.maxTagsPerUser) {
			return {
				available: false,
				error: `Maximum ${limits.maxTagsPerUser} tags per user exceeded`,
				domain
			};
		}

		return {
			available: true,
			domain,
			domainConfig,
			limits
		};

	} catch (error) {
		console.error("Error checking domain availability:", error);
		return {
			available: false,
			error: error.message,
			domain
		};
	}
};

/**
 * Check user limits for a specific operation
 * @param {string} domain - Domain name
 * @param {string} operation - Operation type (create, transfer, renew)
 * @param {Object} authUser - Authenticated user
 * @returns {Object} - User limits check result
 */
const checkUserLimits = async (domain, operation, authUser) => {
	try {
		// Get domain limits
		const limits = getDomainLimits(domain);
		if (!limits) {
			return { available: true }; // No limits defined
		}

		// Check operation-specific limits
		switch (operation) {
			case "create":
				if (limits.maxTagsPerUser && authUser.tagCount >= limits.maxTagsPerUser) {
					return {
						available: false,
						error: `Maximum ${limits.maxTagsPerUser} tags per user exceeded`,
						limit: limits.maxTagsPerUser,
						current: authUser.tagCount
					};
				}
				break;

			case "transfer":
				if (limits.maxTransferPerDay && authUser.dailyTransfers >= limits.maxTransferPerDay) {
					return {
						available: false,
						error: `Maximum ${limits.maxTransferPerDay} transfers per day exceeded`,
						limit: limits.maxTransferPerDay,
						current: authUser.dailyTransfers
					};
				}
				break;

			case "renew":
				if (limits.maxRenewalPerDay && authUser.dailyRenewals >= limits.maxRenewalPerDay) {
					return {
						available: false,
						error: `Maximum ${limits.maxRenewalPerDay} renewals per day exceeded`,
						limit: limits.maxRenewalPerDay,
						current: authUser.dailyRenewals
					};
				}
				break;

			default:
				return {
					available: false,
					error: `Unknown operation: ${operation}`
				};
		}

		return { available: true };

	} catch (error) {
		console.error("Error checking user limits:", error);
		return {
			available: false,
			error: error.message
		};
	}
};

/**
 * Check feature availability for a domain
 * @param {string} domain - Domain name
 * @param {string} feature - Feature name
 * @param {Object} authUser - Authenticated user
 * @returns {Object} - Feature availability result
 */
const checkFeatureAvailability = async (domain, feature, authUser) => {
	try {
		// Check if domain supports the feature
		if (!supportsFeature(domain, feature)) {
			return {
				available: false,
				error: `Feature '${feature}' is not supported for domain '${domain}'`,
				domain,
				feature
			};
		}

		// Get domain configuration
		const domainConfig = getDomainConfiguration(domain);
		if (!domainConfig) {
			return {
				available: false,
				error: `Domain '${domain}' configuration not found`,
				domain,
				feature
			};
		}

		// Check enterprise access for enterprise domains
		if (domainConfig.type === "enterprise" && !authUser.enterpriseAccess) {
			return {
				available: false,
				error: "Enterprise access required for this domain",
				domain,
				feature
			};
		}

		// Check pro access for pro features
		if (feature === "admin" && !authUser.pro) {
			return {
				available: false,
				error: "Pro access required for admin features",
				domain,
				feature
			};
		}

		return {
			available: true,
			domain,
			feature,
			domainConfig
		};

	} catch (error) {
		console.error("Error checking feature availability:", error);
		return {
			available: false,
			error: error.message,
			domain,
			feature
		};
	}
};

/**
 * Get comprehensive availability summary
 * @param {string} tagName - Tag name to check
 * @param {Object} authUser - Authenticated user
 * @returns {Object} - Comprehensive availability summary
 */
const getAvailabilitySummary = async (tagName, authUser) => {
	try {
		// Extract domain and name from tagName
		const parts = tagName.split(".");
		if (parts.length < 2) {
			return {
				available: false,
				error: "Invalid tag name format. Must include domain (e.g., username.avax)",
				tagName
			};
		}

		const domain = parts[parts.length - 1].toLowerCase();
		const name = parts.slice(0, -1).join(".");

		// Check tag availability
		const tagAvailability = await checkTagAvailability(tagName, authUser);
		if (!tagAvailability.available) {
			return tagAvailability;
		}

		// Check domain availability
		const domainAvailability = await checkDomainAvailability(domain, authUser);
		if (!domainAvailability.available) {
			return domainAvailability;
		}

		// Check user limits
		const userLimits = await checkUserLimits(domain, "create", authUser);
		if (!userLimits.available) {
			return userLimits;
		}

		// Get domain configuration
		const domainConfig = getDomainConfiguration(domain);
		const limits = getDomainLimits(domain);

		// Check available features
		const availableFeatures = domainConfig.features || [];

		// Check user access
		const userAccess = {
			canCreate: true,
			canTransfer: availableFeatures.includes("transfer"),
			canRenew: availableFeatures.includes("renewal"),
			canRecover: availableFeatures.includes("recovery"),
			canAdmin: availableFeatures.includes("admin") && authUser.pro,
		};

		return {
			available: true,
			tagName: `${name}.${domain}`,
			domain,
			name,
			holdDomain: tagAvailability.holdDomain,
			domainConfig,
			limits,
			availableFeatures,
			userAccess,
			userLimits: {
				maxTagsPerUser: limits.maxTagsPerUser || 0,
				maxTransferPerDay: limits.maxTransferPerDay || 0,
				maxRenewalPerDay: limits.maxRenewalPerDay || 0,
				currentTags: authUser.tagCount || 0,
				dailyTransfers: authUser.dailyTransfers || 0,
				dailyRenewals: authUser.dailyRenewals || 0,
			}
		};

	} catch (error) {
		console.error("Error getting availability summary:", error);
		return {
			available: false,
			error: error.message,
			tagName
		};
	}
};

/**
 * Check multiple tag names for availability
 * @param {Array} tagNames - Array of tag names to check
 * @param {Object} authUser - Authenticated user
 * @returns {Array} - Array of availability results
 */
const checkMultipleTagAvailability = async (tagNames, authUser) => {
	try {
		const results = await Promise.all(
			tagNames.map(tagName => checkTagAvailability(tagName, authUser))
		);

		return results;

	} catch (error) {
		console.error("Error checking multiple tag availability:", error);
		return tagNames.map(tagName => ({
			available: false,
			error: error.message,
			tagName
		}));
	}
};

/**
 * Get domain statistics and availability
 * @param {string} domain - Domain name
 * @param {Object} authUser - Authenticated user
 * @returns {Object} - Domain statistics and availability
 */
const getDomainStatsAndAvailability = async (domain, authUser) => {
	try {
		// Check domain availability
		const domainAvailability = await checkDomainAvailability(domain, authUser);
		if (!domainAvailability.available) {
			return domainAvailability;
		}

		// Get domain statistics
		const stats = await TagsSearchModule.getDomainStats(domain, authUser);

		// Get domain configuration
		const domainConfig = getDomainConfiguration(domain);
		const limits = getDomainLimits(domain);

		return {
			available: true,
			domain,
			domainConfig,
			limits,
			stats,
			userLimits: {
				maxTagsPerUser: limits.maxTagsPerUser || 0,
				maxTransferPerDay: limits.maxTransferPerDay || 0,
				maxRenewalPerDay: limits.maxRenewalPerDay || 0,
				currentTags: authUser.tagCount || 0,
				dailyTransfers: authUser.dailyTransfers || 0,
				dailyRenewals: authUser.dailyRenewals || 0,
			}
		};

	} catch (error) {
		console.error("Error getting domain stats and availability:", error);
		return {
			available: false,
			error: error.message,
			domain
		};
	}
};

module.exports = {
	checkTagAvailability,
	checkHoldDomainAvailability,
	checkDomainAvailability,
	checkUserLimits,
	checkFeatureAvailability,
	getAvailabilitySummary,
	checkMultipleTagAvailability,
	getDomainStatsAndAvailability,
};
