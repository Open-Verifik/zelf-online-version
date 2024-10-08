const NodeCache = require("node-cache");

require("dotenv").config();

const cache = new NodeCache({
	stdTTL: process.env.NODE_ENV === "production" ? 360 : 60,
});

const userEndpointsMapping = {
	"/api/random": {
		charge: false,
		ttl: 1800,
	},
};

const endpointsMapping = {};

const cacheEngine = (req, res, next) => {
	let cacheKey = _generateCacheKey(req);

	if (!cacheKey) return next();

	const cachedResponse = cache.get(cacheKey);

	if (!cachedResponse) {
		req.params._cacheKey = cacheKey;

		return next();
	}

	res.send(cachedResponse);

	if (cacheKey.charge) {
		// logic to charge the endpoint here
	}

	return next(false);
};

const _generateCacheKey = (req) => {
	let cacheKey = `${req.method}_${req.url}`;

	const authUser = req.user || { clientId: "guest" };

	const endpoint = req.url.split("?")[0];

	if (userEndpointsMapping[endpoint]) {
		cacheKey = `user:${authUser.superAdminId || authUser.staffId || authUser.clientId}@${cacheKey}`;
	} else if (!endpointsMapping[endpoint]) {
		return null;
	}

	if (req.method === "POST" && req.params) {
		const serializedParams = JSON.stringify(req.params);

		cacheKey += `?${serializedParams}`;
	}

	return cacheKey;
};

module.exports = { cacheEngine, cache };
