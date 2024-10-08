const config = require("./Core/config");
const restifyErrors = require("restify-errors");

const endpointsExcluded = {};

const rateLimits = {
	free: {
		//Pay as you go
		minute: { requests: 30, time: 60 }, // 5 requests per minute
		hour: { requests: 500, time: 60 * 60 }, // 500 requests per hour
	},
	basic_plan: {
		minute: { requests: 40, time: 60 }, // 20 requests per minute
		hour: { requests: 1000, time: 60 * 60 }, // 1000 requests per hour
	},
	plus_plan: {
		minute: { requests: 50, time: 60 }, // 50 requests per minute
		hour: { requests: 2000, time: 60 * 60 }, // 2k requests per hour
	},
	business_plan: {
		minute: { requests: 150, time: 60 }, // 50 requests per minute
		hour: { requests: 7000, time: 60 * 60 }, // 7k requests per hour
	},
};

const userRequestCounts = {};

module.exports = async (req, res) => {
	const authUser = req.user;

	if (!authUser || !authUser.clientId) return next();

	const endpoint = req.url.split("?")[0];

	if (endpointsExcluded[endpoint]) return next();

	const user = await UserModule.get(
		{
			where_active: true,
			populates: ["clientSubscriptionPlan"],
			findOne: true,
		},
		{
			clientId: authUser.clientId,
		}
	);

	if (!user) return next(new restifyErrors.ForbiddenError("RLM:Client not found"));

	const currentTime = Date.now();

	const userLimits = rateLimits[config.subDomain ? "subdomain" : user.clientSubscriptionPlan?.code || "free"] || rateLimits.business_plan;

	if (!userRequestCounts[user._id]) {
		userRequestCounts[user._id] = {
			minute: { count: 0, startTime: currentTime },
			hour: { count: 0, startTime: currentTime },
		};
	}

	const userData = userRequestCounts[user._id];

	// Check rate limit for both minute and hour
	for (const timeFrame of ["minute", "hour"]) {
		const frameData = userData[timeFrame];

		const frameLimit = userLimits[timeFrame];

		if (currentTime - frameData.startTime > frameLimit.time * 1000) {
			// Reset the count and time
			frameData.count = 0;
			frameData.startTime = currentTime;
		}

		if (frameData.count >= frameLimit.requests) {
			return new restifyErrors.BandwidthLimitExceededError(`Rate limit exceeded for ${timeFrame}`);
		}

		frameData.count++;
	}

	return null;
};
