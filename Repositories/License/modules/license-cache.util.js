/**
 * Helpers for license cache merge and Pinata record selection.
 * Pinata search can return an older pin after a write; never replace a newer seed with that.
 */

const licenseUpdatedAtMs = (license) => {
	const raw = license?.updatedAt || license?.metadata?.updatedAt || "";
	const ms = Date.parse(raw);
	return Number.isFinite(ms) ? ms : 0;
};

const hasPlanPricing = (license) => {
	const plans = license?.tags?.payment?.planPricing;
	return Boolean(plans && typeof plans === "object" && Object.keys(plans).length > 0);
};

const licenseCid = (record) => {
	if (!record || typeof record !== "object") return "";
	return String(record.ipfsCid || record.IpfsHash || record.IPFSHash || record.id || record.cid || "").trim();
};

const asLicenseJson = (license) => {
	if (!license) return license;
	if (typeof license.toJSON === "function") return license.toJSON();
	return license;
};

const preferLicense = (current, incoming) => {
	if (!incoming) return current;
	if (!current) return incoming;

	const currentHasPlans = hasPlanPricing(current);
	const incomingHasPlans = hasPlanPricing(incoming);
	if (currentHasPlans && !incomingHasPlans) return current;

	const currentTs = licenseUpdatedAtMs(current);
	const incomingTs = licenseUpdatedAtMs(incoming);
	if (currentTs && incomingTs && incomingTs < currentTs) return current;
	if (currentTs && !incomingTs && currentHasPlans) return current;

	return incoming;
};

const isRemoteLicenseStale = (local, remote) => {
	if (!local) return false;
	if (!remote) return true;
	return preferLicense(local, remote) === local;
};

const mergeLicenseMap = (currentMap, incomingList) => {
	const next = { ...(currentMap && typeof currentMap === "object" ? currentMap : {}) };

	for (const license of incomingList || []) {
		if (!license?.name) continue;
		const key = String(license.name).toLowerCase();
		next[key] = asLicenseJson(preferLicense(next[key], license));
	}

	return next;
};

const pickNewestIpfsRecord = (records, preferredCid) => {
	if (!Array.isArray(records) || records.length === 0) return null;

	const wanted = String(preferredCid || "").trim();
	if (wanted) {
		const match = records.find((record) => licenseCid(record) === wanted);
		if (match) return match;
	}

	return [...records].sort((left, right) => {
		const leftTs = Date.parse(left?.Timestamp || left?.timestamp || "") || 0;
		const rightTs = Date.parse(right?.Timestamp || right?.timestamp || "") || 0;
		return rightTs - leftTs;
	})[0];
};

const resolveLicenseRecord = (records, preferredCid, seededRecord) => {
	const wanted = String(preferredCid || licenseCid(seededRecord) || "").trim();
	const listed = Array.isArray(records) ? records : [];

	if (wanted && seededRecord && !listed.some((record) => licenseCid(record) === wanted)) {
		return seededRecord;
	}

	return pickNewestIpfsRecord(listed, wanted) || seededRecord || null;
};

module.exports = {
	licenseUpdatedAtMs,
	hasPlanPricing,
	licenseCid,
	asLicenseJson,
	preferLicense,
	isRemoteLicenseStale,
	mergeLicenseMap,
	pickNewestIpfsRecord,
	resolveLicenseRecord,
};
