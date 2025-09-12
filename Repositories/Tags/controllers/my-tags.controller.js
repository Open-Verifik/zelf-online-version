const Module = require("../modules/my-tags.module");
const { getDomainConfiguration } = require("../modules/domain-registry.module");

/**
 * Get domain-specific configuration
 * @param {string} domain - Domain name
 * @returns {Object} - Domain configuration
 */
const getDomainConfig = (domain) => {
	try {
		return getDomainConfiguration(domain);
	} catch (error) {
		console.error(`Error getting domain config for ${domain}:`, error);
		return getDomainConfiguration("zelf"); // Fallback to zelf
	}
};

/**
 * Transfer tag
 * @param {Object} ctx - Koa context
 * @returns {Object} - Transfer results
 */
const transferTag = async (ctx) => {
	try {
		const { extractedDomain, extractedName } = ctx.state;
		const domainConfig = getDomainConfig(extractedDomain);

		const requestData = {
			...ctx.request.body,
			tagName: extractedName ? `${extractedName}.${extractedDomain}` : ctx.request.body.tagName,
			domain: extractedDomain,
			domainConfig,
		};

		const data = await Module.transferMyTag(requestData, ctx.state.user);

		ctx.body = { data };
	} catch (error) {
		console.error({ error });

		ctx.status = error.status || 500;

		ctx.body = { error: error.message };
	}
};

/**
 * Renew tag
 * @param {Object} ctx - Koa context
 * @returns {Object} - Renewal results
 */
const renewTag = async (ctx) => {
	try {
		const { extractedDomain, extractedName } = ctx.state;
		const domainConfig = getDomainConfig(extractedDomain);

		const requestData = {
			...ctx.request.body,
			tagName: extractedName ? `${extractedName}.${extractedDomain}` : ctx.request.body.tagName,
			domain: extractedDomain,
			domainConfig,
		};

		const data = await Module.renewMyTag(requestData, ctx.state.user);

		ctx.body = { data };
	} catch (error) {
		console.error({ error });

		ctx.status = error.status || 500;

		ctx.body = { error: error.message };
	}
};

/**
 * How to renew tag
 * @param {Object} ctx - Koa context
 * @returns {Object} - Renewal instructions
 */
const howToRenewTag = async (ctx) => {
	try {
		const { extractedDomain, extractedName } = ctx.state;
		const domainConfig = getDomainConfig(extractedDomain);

		const requestData = {
			...ctx.request.query,
			tagName: extractedName ? `${extractedName}.${extractedDomain}` : ctx.request.query.tagName,
			domain: extractedDomain,
			domainConfig,
		};

		const data = await Module.howToRenewMyTag(requestData, ctx.state.user);

		ctx.body = { data };
	} catch (error) {
		console.error({ error });

		ctx.status = error.status || 500;

		ctx.body = { error: error.message };
	}
};

module.exports = {
	transferTag,
	renewTag,
	howToRenewTag,
	getDomainConfig,
};
