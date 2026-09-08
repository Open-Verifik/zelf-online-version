const NodeCache = require("node-cache");

const TTL_SECONDS = 300;

const cache = new NodeCache({
	stdTTL: TTL_SECONDS,
	checkperiod: 60,
	useClones: true,
});

const inflight = new Map();

const normalize = (value) => String(value || "").trim().toLowerCase();

const isEmpty = (value) => {
	if (value == null) return true;
	if (Array.isArray(value) && value.length === 0) return true;
	return false;
};

const keys = {
	clientEmail: (email) => `client:email:${normalize(email)}`,
	clientStaffEmail: (email) => `client:staffEmail:${normalize(email)}`,
	clientPhone: (phone) => `client:phone:${String(phone || "").trim()}`,
	myLicense: (email, withJSON) => `myLicense:${normalize(email)}:${withJSON ? "json" : "plain"}`,
	myLicensePrefix: (email) => `myLicense:${normalize(email)}:`,
	subscription: (domain) => `subscription:${normalize(domain)}`,
	licenseDomain: (domain) => `licenseDomain:${normalize(domain)}`,
};

const getOrLoad = async (key, loader) => {
	const hit = cache.get(key);

	if (hit !== undefined) return hit;

	if (inflight.has(key)) return inflight.get(key);

	const promise = Promise.resolve()
		.then(loader)
		.then((value) => {
			if (!isEmpty(value)) {
				cache.set(key, value);
			}

			inflight.delete(key);

			return value;
		})
		.catch((error) => {
			inflight.delete(key);
			throw error;
		});

	inflight.set(key, promise);

	return promise;
};

const set = (key, value) => {
	if (isEmpty(value)) return false;
	return cache.set(key, value);
};

const del = (key) => cache.del(key);

const delByPrefix = (prefix) => {
	if (!prefix) return 0;

	const matching = cache.keys().filter((key) => key.startsWith(prefix));

	if (matching.length) cache.del(matching);

	return matching.length;
};

const peek = (key) => cache.get(key);

const flush = () => {
	cache.flushAll();
	inflight.clear();
};

const invalidateClient = ({ email, previousEmail, phone, previousPhone } = {}) => {
	for (const value of [email, previousEmail].filter(Boolean)) {
		del(keys.clientEmail(value));
		del(keys.clientStaffEmail(value));
		delByPrefix(keys.myLicensePrefix(value));
	}

	for (const value of [phone, previousPhone].filter(Boolean)) {
		del(keys.clientPhone(value));
	}
};

const invalidateLicense = ({ emails = [], domains = [] } = {}) => {
	for (const email of emails.filter(Boolean)) {
		delByPrefix(keys.myLicensePrefix(email));
	}

	for (const domain of domains.filter(Boolean)) {
		del(keys.subscription(domain));
		del(keys.licenseDomain(domain));
	}
};

module.exports = {
	TTL_SECONDS,
	keys,
	getOrLoad,
	set,
	del,
	delByPrefix,
	peek,
	flush,
	invalidateClient,
	invalidateLicense,
};
