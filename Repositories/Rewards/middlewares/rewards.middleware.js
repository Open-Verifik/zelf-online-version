const { string, validate, number } = require("../../../Core/JoiUtils");
const { extractDomainAndName, validateDomainAndName } = require("../../Tags/middlewares/tags.middleware");

// Utility function to normalize zelfName with .zelf suffix
const normalizeZelfName = (zelfName) => {
	return zelfName?.endsWith(".zelf") ? zelfName : `${zelfName}.zelf`;
};

// Utility function to extract domain and name from tagName
const extractTagInfo = (tagName, domain) => {
	if (!tagName) return { domain: "zelf", name: null };

	// If tagName already contains a domain, extract it
	if (tagName.includes(".")) {
		const parts = tagName.split(".");
		const extractedDomain = parts[parts.length - 1];
		const name = parts.slice(0, -1).join(".");
		return { domain: extractedDomain, name };
	}

	// Use provided domain or default to zelf
	return { domain: domain || "zelf", name: tagName };
};

const schemas = {
	reward: {
		tagName: string().required(),
		domain: string(),
	},
	rewardHistory: {
		tagName: string().required(),
		domain: string(),
		limit: number().optional().min(1).max(100).default(10),
	},
	rewardStats: {
		tagName: string().required(),
		domain: string(),
	},
};

const dailyRewardsValidation = async (ctx, next) => {
	try {
		const { tagName, domain } = ctx.request.body;

		const valid = validate(schemas.reward, {
			tagName,
			domain,
		});

		if (valid.error) {
			ctx.status = 400;
			ctx.body = { error: valid.error.message };
			return;
		}

		// Extract domain and name from tagName
		const { domain: extractedDomain, name } = extractTagInfo(tagName, domain);
		const domainValidation = await validateDomainAndName(extractedDomain, name);

		if (!domainValidation.valid) {
			ctx.status = 400;
			ctx.body = { error: domainValidation.error };
			return;
		}

		// Add extracted domain and name to context for use in controllers
		ctx.state.extractedDomain = extractedDomain;
		ctx.state.extractedName = name;

		await next();
	} catch (error) {
		ctx.status = 400;
		ctx.body = { error: error.message };
	}
};

const rewardHistoryValidation = async (ctx, next) => {
	try {
		const { tagName, domain } = ctx.request.params;
		const { limit } = ctx.request.query;

		const valid = validate(schemas.rewardHistory, {
			tagName,
			domain,
			limit,
		});

		if (valid.error) {
			ctx.status = 400;
			ctx.body = { error: valid.error.message };
			return;
		}

		// Extract domain and name from tagName
		const { domain: extractedDomain, name } = extractTagInfo(tagName, domain);
		const domainValidation = await validateDomainAndName(extractedDomain, name);

		if (!domainValidation.valid) {
			ctx.status = 400;
			ctx.body = { error: domainValidation.error };
			return;
		}

		// Add extracted domain and name to context for use in controllers
		ctx.state.extractedDomain = extractedDomain;
		ctx.state.extractedName = name;

		await next();
	} catch (error) {
		ctx.status = 400;
		ctx.body = { error: error.message };
	}
};

const rewardStatsValidation = async (ctx, next) => {
	try {
		const { tagName, domain } = ctx.request.params;

		const valid = validate(schemas.rewardStats, {
			tagName,
			domain,
		});

		if (valid.error) {
			ctx.status = 400;
			ctx.body = { error: valid.error.message };
			return;
		}

		// Extract domain and name from tagName
		const { domain: extractedDomain, name } = extractTagInfo(tagName, domain);
		const domainValidation = await validateDomainAndName(extractedDomain, name);

		if (!domainValidation.valid) {
			ctx.status = 400;
			ctx.body = { error: domainValidation.error };
			return;
		}

		// Add extracted domain and name to context for use in controllers
		ctx.state.extractedDomain = extractedDomain;
		ctx.state.extractedName = name;

		await next();
	} catch (error) {
		ctx.status = 400;
		ctx.body = { error: error.message };
	}
};

const firstTransactionRewardValidation = async (ctx, next) => {
	try {
		const { tagName, domain } = ctx.request.body;

		const valid = validate(schemas.reward, {
			tagName,
			domain,
		});

		if (valid.error) {
			ctx.status = 400;
			ctx.body = { error: valid.error.message };
			return;
		}

		// Extract domain and name from tagName
		const { domain: extractedDomain, name } = extractTagInfo(tagName, domain);
		const domainValidation = await validateDomainAndName(extractedDomain, name);

		if (!domainValidation.valid) {
			ctx.status = 400;
			ctx.body = { error: domainValidation.error };
			return;
		}

		// Add extracted domain and name to context for use in controllers
		ctx.state.extractedDomain = extractedDomain;
		ctx.state.extractedName = name;

		await next();
	} catch (error) {
		ctx.status = 400;
		ctx.body = { error: error.message };
	}
};

module.exports = {
	dailyRewardsValidation,
	rewardHistoryValidation,
	rewardStatsValidation,
	firstTransactionRewardValidation,
	normalizeZelfName, // Export the utility function for use in other modules
	extractTagInfo, // Export the new utility function for tag extraction
};
