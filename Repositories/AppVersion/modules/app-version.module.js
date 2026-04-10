const semver = require("semver");
const config = require("../../../Core/config");

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
const getVersionCheck = (query) => {
    const platform = query.platform;
    const policy = config.mobileApp[platform];

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
    getVersionCheck,
    normalizeClientVersion,
};
