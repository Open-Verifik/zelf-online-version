const NodeCache = require("node-cache");
let instance;

const initCacheInstance = () => {
	if (instance) return instance;

	instance = new NodeCache({
		stdTTL: 3600, // 1 hour default TTL
		checkperiod: 600, // Check for expired keys every 10 minutes
		useClones: false, // Better performance for large objects
	});

	return instance;
};

const getCacheInstance = () => {
	return instance;
};

module.exports = {
	initCacheInstance,
	getCacheInstance,
};
