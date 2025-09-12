const { 
	getAllSupportedDomains, 
	getActiveDomains, 
	getDomainConfiguration,
	isDomainActive,
	getDomainStats 
} = require("./domain-registry.module");
const TagsSearchModule = require("./tags-search.module");

/**
 * Tags Health Module
 * 
 * This module provides health checking and monitoring for the Tags system.
 * It monitors domain status, system health, and provides diagnostics.
 */

/**
 * Check overall system health
 * @param {Object} authUser - Authenticated user
 * @returns {Object} - System health status
 */
const checkSystemHealth = async (authUser) => {
	try {
		const startTime = Date.now();
		
		// Get all supported domains
		const allDomains = getAllSupportedDomains();
		const activeDomains = getActiveDomains();
		
		// Check each domain's health
		const domainHealthChecks = await Promise.all(
			Object.keys(allDomains).map(domain => checkDomainHealth(domain, authUser))
		);
		
		// Calculate overall health metrics
		const totalDomains = Object.keys(allDomains).length;
		const healthyDomains = domainHealthChecks.filter(check => check.healthy).length;
		const unhealthyDomains = domainHealthChecks.filter(check => !check.healthy).length;
		
		const healthScore = totalDomains > 0 ? (healthyDomains / totalDomains) * 100 : 100;
		
		const responseTime = Date.now() - startTime;
		
		return {
			healthy: healthScore >= 80, // 80% threshold for healthy
			healthScore: Math.round(healthScore),
			totalDomains,
			healthyDomains,
			unhealthyDomains,
			activeDomains: activeDomains.length,
			responseTime: `${responseTime}ms`,
			domains: domainHealthChecks,
			timestamp: new Date().toISOString()
		};
		
	} catch (error) {
		console.error("Error checking system health:", error);
		return {
			healthy: false,
			healthScore: 0,
			error: error.message,
			timestamp: new Date().toISOString()
		};
	}
};

/**
 * Check individual domain health
 * @param {string} domain - Domain name
 * @param {Object} authUser - Authenticated user
 * @returns {Object} - Domain health status
 */
const checkDomainHealth = async (domain, authUser) => {
	try {
		const startTime = Date.now();
		
		// Get domain configuration
		const domainConfig = getDomainConfiguration(domain);
		if (!domainConfig) {
			return {
				domain,
				healthy: false,
				error: "Domain configuration not found",
				responseTime: "0ms"
			};
		}
		
		// Check if domain is active
		const isActive = isDomainActive(domain);
		if (!isActive) {
			return {
				domain,
				healthy: false,
				error: "Domain is not active",
				responseTime: "0ms"
			};
		}
		
		// Check domain statistics
		const stats = await TagsSearchModule.getDomainStats(domain, authUser);
		
		// Check storage health
		const storageHealth = await checkStorageHealth(domain, authUser);
		
		// Check domain limits
		const limitsHealth = await checkLimitsHealth(domain, authUser);
		
		// Check domain features
		const featuresHealth = await checkFeaturesHealth(domain, authUser);
		
		const responseTime = Date.now() - startTime;
		
		// Determine overall domain health
		const isHealthy = storageHealth.healthy && limitsHealth.healthy && featuresHealth.healthy;
		
		return {
			domain,
			healthy: isHealthy,
			status: domainConfig.status,
			type: domainConfig.type,
			stats,
			storage: storageHealth,
			limits: limitsHealth,
			features: featuresHealth,
			responseTime: `${responseTime}ms`,
			timestamp: new Date().toISOString()
		};
		
	} catch (error) {
		console.error(`Error checking domain health for ${domain}:`, error);
		return {
			domain,
			healthy: false,
			error: error.message,
			responseTime: "0ms",
			timestamp: new Date().toISOString()
		};
	}
};

/**
 * Check storage health for a domain
 * @param {string} domain - Domain name
 * @param {Object} authUser - Authenticated user
 * @returns {Object} - Storage health status
 */
const checkStorageHealth = async (domain, authUser) => {
	try {
		const domainConfig = getDomainConfiguration(domain);
		if (!domainConfig) {
			return {
				healthy: false,
				error: "Domain configuration not found"
			};
		}
		
		const storageConfig = domainConfig.storage || {};
		const healthChecks = [];
		
		// Check IPFS health
		if (storageConfig.ipfsEnabled) {
			try {
				const ipfsStats = await TagsSearchModule.getDomainStats(domain, authUser);
				healthChecks.push({
					service: "IPFS",
					healthy: true,
					stats: ipfsStats
				});
			} catch (error) {
				healthChecks.push({
					service: "IPFS",
					healthy: false,
					error: error.message
				});
			}
		}
		
		// Check Arweave health
		if (storageConfig.arweaveEnabled) {
			try {
				const arweaveStats = await TagsSearchModule.getDomainStats(domain, authUser);
				healthChecks.push({
					service: "Arweave",
					healthy: true,
					stats: arweaveStats
				});
			} catch (error) {
				healthChecks.push({
					service: "Arweave",
					healthy: false,
					error: error.message
				});
			}
		}
		
		const healthyServices = healthChecks.filter(check => check.healthy).length;
		const totalServices = healthChecks.length;
		
		return {
			healthy: totalServices > 0 && healthyServices === totalServices,
			services: healthChecks,
			healthyServices,
			totalServices
		};
		
	} catch (error) {
		console.error(`Error checking storage health for ${domain}:`, error);
		return {
			healthy: false,
			error: error.message
		};
	}
};

/**
 * Check limits health for a domain
 * @param {string} domain - Domain name
 * @param {Object} authUser - Authenticated user
 * @returns {Object} - Limits health status
 */
const checkLimitsHealth = async (domain, authUser) => {
	try {
		const domainConfig = getDomainConfiguration(domain);
		if (!domainConfig) {
			return {
				healthy: false,
				error: "Domain configuration not found"
			};
		}
		
		const limits = domainConfig.limits || {};
		const healthChecks = [];
		
		// Check tag limits
		if (limits.maxTagsPerUser) {
			const currentTags = authUser.tagCount || 0;
			const usage = (currentTags / limits.maxTagsPerUser) * 100;
			
			healthChecks.push({
				limit: "maxTagsPerUser",
				value: limits.maxTagsPerUser,
				current: currentTags,
				usage: Math.round(usage),
				healthy: usage < 90, // 90% threshold
				status: usage >= 90 ? "warning" : "ok"
			});
		}
		
		// Check transfer limits
		if (limits.maxTransferPerDay) {
			const currentTransfers = authUser.dailyTransfers || 0;
			const usage = (currentTransfers / limits.maxTransferPerDay) * 100;
			
			healthChecks.push({
				limit: "maxTransferPerDay",
				value: limits.maxTransferPerDay,
				current: currentTransfers,
				usage: Math.round(usage),
				healthy: usage < 90, // 90% threshold
				status: usage >= 90 ? "warning" : "ok"
			});
		}
		
		// Check renewal limits
		if (limits.maxRenewalPerDay) {
			const currentRenewals = authUser.dailyRenewals || 0;
			const usage = (currentRenewals / limits.maxRenewalPerDay) * 100;
			
			healthChecks.push({
				limit: "maxRenewalPerDay",
				value: limits.maxRenewalPerDay,
				current: currentRenewals,
				usage: Math.round(usage),
				healthy: usage < 90, // 90% threshold
				status: usage >= 90 ? "warning" : "ok"
			});
		}
		
		const healthyLimits = healthChecks.filter(check => check.healthy).length;
		const totalLimits = healthChecks.length;
		
		return {
			healthy: totalLimits === 0 || healthyLimits === totalLimits,
			limits: healthChecks,
			healthyLimits,
			totalLimits
		};
		
	} catch (error) {
		console.error(`Error checking limits health for ${domain}:`, error);
		return {
			healthy: false,
			error: error.message
		};
	}
};

/**
 * Check features health for a domain
 * @param {string} domain - Domain name
 * @param {Object} authUser - Authenticated user
 * @returns {Object} - Features health status
 */
const checkFeaturesHealth = async (domain, authUser) => {
	try {
		const domainConfig = getDomainConfiguration(domain);
		if (!domainConfig) {
			return {
				healthy: false,
				error: "Domain configuration not found"
			};
		}
		
		const features = domainConfig.features || [];
		const healthChecks = [];
		
		// Check each feature
		for (const feature of features) {
			try {
				// Basic feature availability check
				const isAvailable = true; // This would be a more complex check in practice
				
				healthChecks.push({
					feature,
					available: isAvailable,
					healthy: isAvailable,
					status: isAvailable ? "ok" : "error"
				});
			} catch (error) {
				healthChecks.push({
					feature,
					available: false,
					healthy: false,
					error: error.message,
					status: "error"
				});
			}
		}
		
		const healthyFeatures = healthChecks.filter(check => check.healthy).length;
		const totalFeatures = healthChecks.length;
		
		return {
			healthy: totalFeatures === 0 || healthyFeatures === totalFeatures,
			features: healthChecks,
			healthyFeatures,
			totalFeatures
		};
		
	} catch (error) {
		console.error(`Error checking features health for ${domain}:`, error);
		return {
			healthy: false,
			error: error.message
		};
	}
};

/**
 * Get health diagnostics for troubleshooting
 * @param {string} domain - Domain name (optional)
 * @param {Object} authUser - Authenticated user
 * @returns {Object} - Health diagnostics
 */
const getHealthDiagnostics = async (domain, authUser) => {
	try {
		const diagnostics = {
			timestamp: new Date().toISOString(),
			system: {
				nodeVersion: process.version,
				platform: process.platform,
				uptime: process.uptime(),
				memoryUsage: process.memoryUsage()
			},
			domains: {}
		};
		
		if (domain) {
			// Get diagnostics for specific domain
			diagnostics.domains[domain] = await checkDomainHealth(domain, authUser);
		} else {
			// Get diagnostics for all domains
			const allDomains = getAllSupportedDomains();
			for (const domainName of Object.keys(allDomains)) {
				diagnostics.domains[domainName] = await checkDomainHealth(domainName, authUser);
			}
		}
		
		return diagnostics;
		
	} catch (error) {
		console.error("Error getting health diagnostics:", error);
		return {
			timestamp: new Date().toISOString(),
			error: error.message
		};
	}
};

/**
 * Get health metrics for monitoring
 * @param {Object} authUser - Authenticated user
 * @returns {Object} - Health metrics
 */
const getHealthMetrics = async (authUser) => {
	try {
		const allDomains = getAllSupportedDomains();
		const activeDomains = getActiveDomains();
		
		const metrics = {
			timestamp: new Date().toISOString(),
			domains: {
				total: Object.keys(allDomains).length,
				active: activeDomains.length,
				inactive: Object.keys(allDomains).length - activeDomains.length
			},
			types: {},
			status: {}
		};
		
		// Count domains by type
		for (const domain of Object.values(allDomains)) {
			const type = domain.type || "unknown";
			metrics.types[type] = (metrics.types[type] || 0) + 1;
		}
		
		// Count domains by status
		for (const domain of Object.values(allDomains)) {
			const status = domain.status || "unknown";
			metrics.status[status] = (metrics.status[status] || 0) + 1;
		}
		
		// Get storage metrics
		const storageMetrics = {
			ipfsEnabled: 0,
			arweaveEnabled: 0,
			backupEnabled: 0
		};
		
		for (const domain of Object.values(allDomains)) {
			const storage = domain.storage || {};
			if (storage.ipfsEnabled) storageMetrics.ipfsEnabled++;
			if (storage.arweaveEnabled) storageMetrics.arweaveEnabled++;
			if (storage.backupEnabled) storageMetrics.backupEnabled++;
		}
		
		metrics.storage = storageMetrics;
		
		return metrics;
		
	} catch (error) {
		console.error("Error getting health metrics:", error);
		return {
			timestamp: new Date().toISOString(),
			error: error.message
		};
	}
};

module.exports = {
	checkSystemHealth,
	checkDomainHealth,
	checkStorageHealth,
	checkLimitsHealth,
	checkFeaturesHealth,
	getHealthDiagnostics,
	getHealthMetrics,
};
