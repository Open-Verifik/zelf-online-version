const semver = require("semver");
const MobileAppVersionPolicy = require("../models/mobile-app-version-policy.model");

const POLICY_KEY = "default";

/** Inserted on first read when no policy document exists (`$setOnInsert`). Existing MongoDB documents are not modified. */
const DEFAULT_DOC = {
    key: POLICY_KEY,
    ios: {
        latestVersion: "2.16.1",
        minimumVersion: "2.16.1",
        storeUrl: "",
    },
    android: {
        latestVersion: "3.16.1",
        minimumVersion: "3.16.1",
        storeUrl: "",
    },
};

/**
 * @returns {Promise<import("mongoose").LeanDocument<any>>}
 */
const getPolicyDocument = async () => {
    const existing = await MobileAppVersionPolicy.findOne({ key: POLICY_KEY }).lean();
    if (existing) {
        return existing;
    }
    try {
        return await MobileAppVersionPolicy.findOneAndUpdate({ key: POLICY_KEY }, { $setOnInsert: DEFAULT_DOC }, { upsert: true, new: true }).lean();
    } catch (err) {
        if (err && err.code === 11000) {
            return MobileAppVersionPolicy.findOne({ key: POLICY_KEY }).lean();
        }
        throw err;
    }
};

/**
 * Normalize user-supplied version (e.g. "v1.2.3" or "1.2.3-beta") to a comparable semver string.
 * @param {string} input
 * @returns {string|null}
 */
const normalizeClientVersion = (input) => {
    if (input == null || input === "") return null;
    const coerced = semver.coerce(String(input).trim());
    return coerced ? coerced.version : null;
};

/**
 * @param {{ platform: string, current?: string }} query
 */
const getVersionCheck = async (query) => {
    const platform = query.platform;
    const doc = await getPolicyDocument();
    const policy = doc && doc[platform];

    if (!policy) {
        throw new Error("400:Unsupported platform");
    }

    const latestVersion = String(policy.latestVersion || "").trim();
    const minimumVersion = String(policy.minimumVersion || "").trim();
    const storeUrl = String(policy.storeUrl || "").trim();

    if (!semver.valid(latestVersion) || !semver.valid(minimumVersion)) {
        throw new Error("500:Mobile app version configuration is invalid");
    }

    if (semver.gt(minimumVersion, latestVersion)) {
        throw new Error("500:minimumVersion must be less than or equal to latestVersion");
    }

    /** @type {Record<string, unknown>} */
    const data = {
        platform,
        latestVersion,
        minimumVersion,
        storeUrl,
    };

    const currentRaw = query.current;
    if (currentRaw === undefined || currentRaw === null || String(currentRaw).trim() === "") {
        return data;
    }

    const normalized = normalizeClientVersion(String(currentRaw));
    if (!normalized || !semver.valid(normalized)) {
        throw new Error("422:current must be a valid semantic version");
    }

    data.currentClientVersion = normalized;
    data.updateAvailable = semver.lt(normalized, latestVersion);
    data.forceUpdate = semver.lt(normalized, minimumVersion);

    return data;
};

module.exports = {
    getPolicyDocument,
    getVersionCheck,
    normalizeClientVersion,
};
