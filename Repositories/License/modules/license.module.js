const axios = require("../../../Core/axios").getEncryptionInstance();
const config = require("../../../Core/config");
const IPFS = require("../../../Repositories/IPFS/modules/ipfs.module");
const ClientModule = require("../../Client/modules/client.module");
const { decrypt } = require("../../ZelfProof/modules/zelf-proof.module");
const moment = require("moment");
const TagsIPFSModule = require("../../Tags/modules/tags-ipfs.module");
const DefaultLicenseValues = require("./default-license.values");
const { Domain } = require("../../Tags/modules/domain.class");
const { initCacheInstance } = require("../../../cache/manager");

// Initialize cache with 2 hour TTL and check period of 10 minutes (see cache/manager.js stdTTL)
const licenseCache = initCacheInstance();

/**
 * @param {*} value - query param includeThemeSettings
 * @returns {boolean}
 */
const parseIncludeThemeSettings = (value) => {
    if (value === undefined || value === null || value === "") return false;
    if (value === true) return true;
    const s = String(value).toLowerCase();
    return s === "1" || s === "true";
};

const _deepMergeThemeObjects = (target, source) => {
    if (!source || typeof source !== "object" || Array.isArray(source)) return target;
    if (!target || typeof target !== "object" || Array.isArray(target)) return { ...source };
    const result = { ...target };
    for (const key of Object.keys(source)) {
        if (
            source[key] &&
            typeof source[key] === "object" &&
            !Array.isArray(source[key]) &&
            result[key] &&
            typeof result[key] === "object" &&
            !Array.isArray(result[key])
        ) {
            result[key] = _deepMergeThemeObjects(result[key], source[key]);
        } else {
            result[key] = source[key];
        }
    }
    return result;
};

const _normalizeRemoteThemePayload = (data) => {
    if (!data || typeof data !== "object") return {};
    if (data.themeSettings && typeof data.themeSettings === "object" && !Array.isArray(data.themeSettings)) {
        return data.themeSettings;
    }
    return data;
};

/**
 * When official license JSON includes themeSettingsUrl, fetch that document and deep-merge into domainConfig.themeSettings.
 * Mutates domainConfig. Does not throw on fetch failure.
 * @param {Object} domainConfig - license JSON (same shape as IPFS domain file)
 */
const fetchAndMergeOfficialThemeSettings = async (domainConfig) => {
    if (!domainConfig || typeof domainConfig !== "object") return;

    const url = typeof domainConfig.themeSettingsUrl === "string" ? domainConfig.themeSettingsUrl.trim() : "";

    if (!url) return;

    try {
        console.log("fetching theme settings from:", url);
        const jsonResponse = await axios.get(url);
        const remote = _normalizeRemoteThemePayload(jsonResponse.data);
        domainConfig.themeSettings = _deepMergeThemeObjects(domainConfig.themeSettings || {}, remote);
    } catch (error) {
        console.warn("[license] Optional themeSettings fetch failed:", url, error.message);
    }
};

/**
 * Load licenses from cache
 * @returns {Array|null} - Cached licenses or null if not found/expired
 */
const loadCache = () => {
    try {
        const cached = licenseCache.get("official-licenses");
        if (cached) {
            console.info("Loading official licenses from memory cache");
            return cached;
        }
        return null;
    } catch (error) {
        console.error("Error loading from cache:", error);
        return null;
    }
};

/**
 * Save licenses to cache
 * @param {Array} licenses - License data to cache
 */
const saveCache = (licenses) => {
    try {
        // Check if we need to update the cache (avoid unnecessary operations)
        const existingCache = loadCache();
        if (existingCache && JSON.stringify(existingCache) === JSON.stringify(licenses)) {
            console.log("Cache unchanged, skipping update");
            return;
        }

        const licensesMap = licenses.reduce((acc, license) => {
            acc[license.name.toLowerCase()] = license;
            return acc;
        }, {});

        // Save to memory cache with automatic expiration
        licenseCache.set("official-licenses", licensesMap);

        console.log(
            `Official licenses cached successfully (${licenses.length} licenses, TTL: ${licenseCache.getTtl("official-licenses") ? Math.round((licenseCache.getTtl("official-licenses") - Date.now()) / 1000) : "N/A"
            }s)`
        );
    } catch (error) {
        console.error("Error saving to cache:", error);
    }
};

/**
 * Clear the license cache (useful for testing or manual refresh)
 */
const clearCache = () => {
    licenseCache.del("official-licenses");
    console.log("License cache cleared");
};

/**
 * Get cache statistics
 */
const getCacheStats = () => {
    return {
        keys: licenseCache.keys(),
        stats: licenseCache.getStats(),
        ttl: licenseCache.getTtl("official-licenses"),
    };
};

/**
 * Search for license by domain
 * @param {Object} query - Query parameters
 * @param {Object} user - User object
 * @returns {Object} - License data or null
 */
const searchLicense = async (query, user) => {
    const { domain, withJSON = true, includeThemeSettings } = query;
    const includeTheme = parseIncludeThemeSettings(includeThemeSettings);

    if (domain) {
        const existingLicense = await IPFS.get({ key: "licenseDomain", value: domain });

        if (!existingLicense.length) throw new Error("404:license_not_found");

        const licenseRecord = existingLicense[0];

        // Fetch the complete JSON content from IPFS URL if requested
        if (withJSON) {
            try {
                const jsonResponse = await axios.get(licenseRecord.url);
                licenseRecord.domainConfig = jsonResponse.data;

                if (includeTheme && licenseRecord.domainConfig) {
                    await fetchAndMergeOfficialThemeSettings(licenseRecord.domainConfig);
                }
            } catch (error) {
                console.error("Error getting license JSON from url:", error);
                throw error;
            }
        }

        return licenseRecord;
    }

    // For getting all licenses, also fetch JSON content
    const allLicenses = await IPFS.get({ key: "type", value: "license" });

    if (withJSON) {
        for (const license of allLicenses) {
            try {
                const jsonResponse = await axios.get(license.url);

                license.domainConfig = jsonResponse.data;
                if (includeTheme && license.domainConfig) {
                    await fetchAndMergeOfficialThemeSettings(license.domainConfig);
                }
            } catch (error) {
                console.error(`Error getting license JSON for ${license.id}:`, error);
                // Continue with other licenses even if one fails
            }
        }
    }

    return allLicenses;
};

/**
 * Org owner email bound to a staff account (IPFS JSON and/or client publicData).
 * @param {Object} client - Client record from ClientModule.get
 * @param {Object} accountData - Parsed body from client.url (staff JSON)
 * @returns {string} - Normalized email or empty string
 */
const _resolveStaffOrgOwnerEmail = (client, accountData) => {
    const data = accountData && typeof accountData === "object" ? accountData : {};
    const pd = client?.publicData && typeof client.publicData === "object" ? client.publicData : {};
    const candidates = [data.ownerEmail, data.staffOwnerEmail, pd.staffOwnerEmail, pd.ownerEmail];

    for (const c of candidates) {
        if (c && String(c).trim()) {
            return String(c).trim();
        }
    }

    return "";
};

/**
 * Staff proves identity with **staff** face + password (decrypt staff zelfProof), then licenses load by org owner (licenseOwner index).
 * @param {Object} jwt - JWT
 * @param {boolean} withJSON - Load full license JSON
 * @param {Object} ownershipCredentials - { faceBase64, masterPassword }
 * @returns {Promise<Object>}
 */
const _getMyLicenseForStaffWithCredentials = async (jwt, withJSON, ownershipCredentials) => {
    const { faceBase64, masterPassword } = ownershipCredentials;

    // Must load the **staff** IPFS row (staffEmail index). `ClientModule.get({ email })` tries
    // `accountEmail` first and can return the **org owner** client when emails overlap — then
    // decrypt runs on the owner's zelfProof with staff face/password and fails.
    const staffLookupKeys = [...new Set([jwt.staffEmail, jwt.email].filter(Boolean))];

    let client = null;

    for (const em of staffLookupKeys) {
        client = await ClientModule.getByStaffEmail(String(em).trim());

        if (client) break;
    }

    if (!client) throw new Error("404:staff_client_not_found");

    const accountJSON = await axios.get(client.url);

    const accountZelfProof = accountJSON.data.zelfProof;

    const decryptedAccount = await decrypt({
        zelfProof: accountZelfProof,
        faceBase64,
        password: masterPassword || undefined,
        verifierKey: config.zelfEncrypt.serverKey,
    });

    console.log("decryptedAccount", decryptedAccount);

    const orgOwnerEmail = _resolveStaffOrgOwnerEmail(client, accountJSON.data);

    if (!orgOwnerEmail) {
        throw new Error("400:staff_org_owner_email_missing");
    }

    if (jwt.ownerEmail && orgOwnerEmail.toLowerCase() !== String(jwt.ownerEmail).toLowerCase()) {
        throw new Error("403:staff_owner_email_mismatch");
    }

    const myRecords = await IPFS.get({ key: "licenseOwner", value: orgOwnerEmail });

    const myLicenses = [];

    for (const record of myRecords) {
        if (record.publicData.type === "license") {
            myLicenses.push(record);
        }
    }

    if (withJSON && myLicenses.length) {
        try {
            const jsonResponse = await axios.get(myLicenses[0].url);

            myLicenses[0].domainConfig = jsonResponse.data;
        } catch (error) {
            console.error("Error getting json from url:", error);
            throw error;
        }
    }

    const ownerClient = await ClientModule.get({ email: orgOwnerEmail });

    return {
        myLicense: myLicenses.length ? myLicenses[0] : null,
        zelfAccount: ownerClient || client,
        accountZelfProof,
        accountJSON,
    };
};

/**
 * Get user's own licenses
 * @param {Object} query - Query parameters
 * @param {Object} jwt - JWT object
 * @returns {Promise<Array>} - Array of user's licenses
 */
const getMyLicense = async (jwt, withJSON = false, ownershipCredentials) => {
    // Staff JWT may use accountType "staff" (Staff auth) or "staff_account" (unified Client auth)
    const isStaffUser = jwt.accountType === "staff" || jwt.accountType === "staff_account";

    // Biometric path: staff decrypts the **staff** zelfProof; licenses resolve via staffOwnerEmail/ownerEmail → licenseOwner
    if (isStaffUser && ownershipCredentials) {
        return _getMyLicenseForStaffWithCredentials(jwt, withJSON, ownershipCredentials);
    }

    // Non-staff, or staff GET without biometrics: load client for license index by accountEmail
    const targetEmail = isStaffUser && jwt.ownerEmail ? jwt.ownerEmail : jwt.email;

    // Get client data to get the zelfProof
    const client = await ClientModule.get({ email: targetEmail });

    if (!client) throw new Error("404:client_not_found");

    const metadata = client.publicData;

    let accountZelfProof = null;

    let accountJSON = null;

    // if ownershipCredentials are provided, we need to verify the ownership of the license
    if (ownershipCredentials) {
        const { faceBase64, masterPassword } = ownershipCredentials;

        accountJSON = await axios.get(client.url);

        accountZelfProof = accountJSON.data.zelfProof;

        await decrypt({
            zelfProof: accountZelfProof,
            faceBase64,
            password: masterPassword || undefined,
            verifierKey: config.zelfEncrypt.serverKey,
        });
    }

    let myRecords = [];
    // Search for all licenses with the same zelfProof
    if (metadata.accountEmail) {
        myRecords = await IPFS.get({ key: "licenseOwner", value: metadata.accountEmail });
    }

    const myLicenses = [];

    for (const record of myRecords) {
        if (record.publicData.type === "license") {
            myLicenses.push(record);
        }
    }

    let jsonResponse = null;

    // get the json from the url
    if (withJSON && myLicenses.length) {
        try {
            jsonResponse = await axios.get(myLicenses[0].url);

            myLicenses[0].domainConfig = jsonResponse.data;
        } catch (error) {
            console.error("Error getting json from url:", error);
            throw error;
        }
    }

    return {
        myLicense: myLicenses.length ? myLicenses[0] : null,
        zelfAccount: client,
        accountZelfProof,
        accountJSON,
    };
};

/**
 * Get user's zelfProof from database or JWT
 * @param {string} userEmail - User email
 * @returns {string|null} - User's zelfProof or null
 */
const getUserZelfProof = async (userEmail) => {
    try {
        // This would typically query the database for the user's zelfProof
        // For now, we'll assume it's stored in a user table or can be retrieved from JWT
        // You might need to implement this based on your user management system

        // Example implementation - you'll need to adapt this to your actual user storage
        const user = await getUserByEmail(userEmail);
        return user?.zelfProof || null;
    } catch (error) {
        console.error("Get user zelfProof error:", error);
        throw error;
    }
};

/**
 * Filter domain config to only include user-modifiable fields
 * @param {Object} domainConfig - Full domain configuration
 * @param {Object} existingLicense - Existing license data (if updating)
 * @returns {Object} - Filtered domain configuration
 */
const filterUserModifiableFields = (domainConfig, existingLicense = null) => {
    // Fields that users are NOT allowed to modify (system-managed)
    const protectedFields = [
        "startDate",
        "endDate",
        "expiresAt",
        "subscriptionId",
        "previousDomain",
        "owner",
        "zelfProof",
        "type",
        "licenseType",
        "stripe",
    ];

    // If updating existing license, preserve system-managed fields
    if (existingLicense) {
        const existingData = existingLicense.domainConfig || existingLicense;

        // Preserve system-managed fields from existing license
        protectedFields.forEach((field) => {
            if (existingData[field] !== undefined) {
                domainConfig[field] = existingData[field];
            }
        });

        // Preserve limits from existing license (only modified via Stripe subscription)
        if (existingData.limits) {
            domainConfig.limits = existingData.limits;
        }

        // Preserve Stripe data from existing license (only modified via Stripe webhooks)
        if (existingData.stripe) {
            domainConfig.stripe = existingData.stripe;
        }
    } else {
        // For new licenses, set default system-managed fields
        domainConfig.startDate = moment().format("YYYY-MM-DD HH:mm:ss");
        domainConfig.endDate = moment().add(1, "year").format("YYYY-MM-DD HH:mm:ss");
        domainConfig.expiresAt = moment().add(1, "year").format("YYYY-MM-DD HH:mm:ss");
        domainConfig.subscriptionId = "free";
        domainConfig.previousDomain = "";
        domainConfig.type = domainConfig.type || "custom";
        domainConfig.limits = {
            tags: 100,
            zelfkeys: 100,
            zelfProofs: 100,
        };
        domainConfig.stripe = {
            productId: "",
            priceId: "",
            latestInvoiceId: "",
            amountPaid: 0,
            paidAt: "",
        };
    }

    return domainConfig;
};

/**
 * Upload license logo to IPFS and set metadata.logo on filteredDomainConfig
 * @param {string} logoBase64 - Data URI or base64 image
 * @param {string} domain - License domain name
 * @param {Object} filteredDomainConfig - Domain config to mutate with logo URL
 */
const _uploadLicenseLogo = async (logoBase64, domain, filteredDomainConfig) => {
    if (!logoBase64 || !logoBase64.trim()) return;

    try {
        const mimeMatch = logoBase64.match(/^data:([^;]+);base64,/);
        let ext = mimeMatch ? (mimeMatch[1].split("/")[1] || "png") : "png";
        if (ext.includes("svg")) ext = "svg";
        const fileName = `${domain}_logo_${Date.now()}.${ext}`;
        const ipfsResult = await IPFS.insert(
            {
                base64: logoBase64,
                metadata: { type: "license_logo", licenseDomain: domain },
                name: fileName,
                pinIt: true,
            },
            { pro: true }
        );
        if (ipfsResult?.url) {
            filteredDomainConfig.metadata = filteredDomainConfig.metadata || {};
            filteredDomainConfig.metadata.logo = ipfsResult.url;
        }
    } catch (logoError) {
        console.error("Logo IPFS upload error:", logoError);
        throw new Error("500:logo_upload_failed");
    }
};

/**
 * Create or update license
 * @param {Object} body - Request body
 * @param {Object} user - User object
 * @returns {Object} - License data
 */
const createOrUpdateLicense = async (body, jwt) => {
    const { faceBase64, masterPassword, domainConfig, logoBase64 } = body;

    try {
        const { myLicense, zelfAccount, accountZelfProof } = await getMyLicense(jwt, false, { faceBase64, masterPassword });

        // validate if the domain being passed is registered or not because we need to compare the domain with the previous domain
        await _checkIfDomainIsRegistered(body.domain, zelfAccount.publicData.accountEmail);

        if (myLicense) await TagsIPFSModule.unPinFiles([myLicense.id]);

        // Filter domain config to only include user-modifiable fields
        const filteredDomainConfig = filterUserModifiableFields(domainConfig, myLicense);

        await _uploadLicenseLogo(logoBase64, body.domain, filteredDomainConfig);

        const licenseMetadata = {
            ...filteredDomainConfig,
            licenseType: filteredDomainConfig.type,
            type: "license",
            previousDomain: myLicense?.publicData.domain || "",
            domain: body.domain,
            owner: jwt.email,
            zelfProof: accountZelfProof,
        };

        const jsonData = JSON.stringify(licenseMetadata, null, 2);

        const base64Data = Buffer.from(jsonData).toString("base64");

        const license = await IPFS.insert(
            {
                base64: base64Data,
                metadata: {
                    type: "license",
                    licenseType: filteredDomainConfig.type,
                    licenseSubscriptionId: filteredDomainConfig.subscriptionId || "free",
                    licenseDomain: body.domain,
                    licenseOwner: jwt.email,
                },
                name: `${body.domain}.license`,
                pinIt: true,
            },
            { pro: true }
        );

        return {
            ipfs: license,
            ...licenseMetadata,
            type: licenseMetadata.licenseType,
        };
    } catch (error) {
        console.error("Create/Update license error:", error);
        throw error;
    }
};

/**
 * Delete license by IPFS hash
 * @param {Object} params - Request parameters
 * @param {Object} user - User object
 * @returns {Object} - Deletion confirmation
 */
const deleteLicense = async (params, authUser) => {
    const { faceBase64, masterPassword } = params;

    try {
        const { myLicense } = await getMyLicense(authUser, false, { faceBase64, masterPassword });

        if (!myLicense) throw new Error("404:license_not_found");

        // Unpin from IPFS
        const deletedFiles = await IPFS.unPinFiles([myLicense.id]);

        return {
            success: true,
            message: "License deleted successfully",
            deletedFiles,
        };
    } catch (error) {
        console.error("Delete license error:", error);
        throw error;
    }
};

/**
 * Get user by email (placeholder - implement based on your user management)
 */
const getUserByEmail = async (email) => {
    // This is a placeholder - you'll need to implement this based on your user storage
    // It could query a database, call another service, etc.
    try {
        // Example implementation - replace with actual user lookup
        // const user = await User.findOne({ email });
        // return user;

        // For now, return null - you'll need to implement this
        return null;
    } catch (error) {
        console.error("Get user by email error:", error);
        throw error;
    }
};

/**
 * Check if the domain is registered
 */
const _checkIfDomainIsRegistered = async (domain, accountEmail) => {
    // Search for all licenses with the same zelfProof
    const domains = await IPFS.get({ key: "licenseDomain", value: domain });

    if (!domains.length) return;

    const foundDomain = domains[0];

    if (foundDomain.publicData.licenseOwner !== accountEmail) throw new Error("409:domain_already_registered");
};

/**
 * Load official licenses with improved caching
 * @param {boolean} force - Force reload from IPFS, bypassing cache
 * @returns {Array} - Array of license objects
 * @remarks Each official license JSON in IPFS should set `"status": "active"` for its `name` TLD; otherwise the Domain class defaults to inactive and tag APIs reject that domain (e.g. search validation).
 */
const loadOfficialLicenses = async (force = false) => {
    // Try to get from cache first (unless forced)
    if (!force) {
        const cachedData = loadCache();

        if (cachedData) return cachedData;
    }

    try {
        // Fetch from IPFS
        const officialLicenses = await IPFS.get({ key: "type", value: "license" });

        const licensePromises = officialLicenses.map(async (license) => {
            try {
                return await _loadLicenseJSON(license.url);
            } catch (error) {
                console.error(`Error loading license ${license.id}:`, error.message);
                return null;
            }
        });

        const results = await Promise.all(licensePromises);
        const licenses = results.filter((license) => license !== null);

        // Save to cache with automatic expiration
        saveCache(licenses);

        console.info(`Loaded ${licenses.length} official licenses successfully`);

        return licenses;
    } catch (error) {
        console.error("Error loading official licenses:", error);

        // Try to return cached data as fallback
        const fallbackCache = loadCache();
        if (fallbackCache) {
            console.warn("Using cached data as fallback");
            return fallbackCache;
        }

        throw error;
    }
};

const _loadLicenseJSON = async (ipfsUrl) => {
    // from the zelfAccount.url we should get the json from that then asisgn the name to the zelfAccount.metadata.keyvalues.name
    const jsonData = await axios.get(ipfsUrl);

    return jsonData.data;
};

// Deprecated: use saveSubscriptionRecord instead to keep license and subscription separate
const syncLicenseWithStripe = async (license, paymentData) => {
    return saveSubscriptionRecord(license, paymentData);
};

// New function to save subscription as a separate IPFS record
const saveSubscriptionRecord = async (license, paymentData) => {
    const licenseData = license
        ? await _loadLicenseJSON(license.url)
        : {
            owner: paymentData.customerEmail,
            name: "zelf", // Default name if license not found
            type: "license",
        };

    // Use the original price from the subscription to identify the plan,
    // as the paid amount might be different due to coupons, discounts, or prorations.
    const subscriptionPrice = paymentData.subscription?.items?.data[0]?.price?.unit_amount;

    const priceToMatch = subscriptionPrice !== undefined ? subscriptionPrice : paymentData.amountPaid;

    const plan = DefaultLicenseValues.findPlanByPrice(priceToMatch);

    if (!plan) {
        console.error(`Plan not found for price: ${priceToMatch} (Paid: ${paymentData.amountPaid})`);

        throw new Error(`Plan not found for price: ${priceToMatch}`);
    }

    const domainName = licenseData.name || "zelf";

    // Create subscription object
    const subscriptionObject = {
        domain: domainName,
        limits: plan.limits,
        planCode: plan.code,
        subscriptionId: paymentData.subscriptionId,
        startDate: moment(new Date(paymentData.subscription.current_period_start * 1000)).format("YYYY-MM-DD HH:mm:ss"),
        endDate: moment(new Date(paymentData.subscription.current_period_end * 1000)).format("YYYY-MM-DD HH:mm:ss"),
        expiresAt: moment(new Date(paymentData.subscription.current_period_end * 1000))
            .add(15, "days")
            .format("YYYY-MM-DD HH:mm:ss"),
        stripe: {
            subscriptionId: paymentData.subscriptionId,
            customerId: paymentData.customerId,
            productId: paymentData.subscription.items?.data[0]?.plan?.product,
            priceId: paymentData.priceId || paymentData.subscription?.items?.data[0]?.price?.id,
            latestInvoiceId: paymentData.invoiceId,
            amountPaid: paymentData.amountPaid,
            paidAt: paymentData.paidAt,
            status: paymentData.status,
        },
        updatedAt: new Date().toISOString(),
    };

    // We'll unpin any previous subscription file for this domain/subscription to avoid clutter?
    // Actually, maybe we should keep history? IPFS is immutable, so old files exist but pinning ensures availability.
    // If we want to "update", we should probably unpin the old one if we can find it.
    // For now, let's just insert the new one.

    // Attempt to find existing subscription for this domain to unpin it (cleanup)
    const existingSubscriptions = await IPFS.get({ key: "subscriptionDomain", value: domainName });

    if (existingSubscriptions && existingSubscriptions.length > 0) {
        // Unpin old subscriptions for this domain??
        // Maybe we just unpin the one that matches the same subscriptionId if we want to update?
        // Or if we want to have only one active subscription record per domain?
        // Let's assume one active subscription per domain.
        await TagsIPFSModule.unPinFiles(existingSubscriptions.map((s) => s.id));
    }

    const jsonData = JSON.stringify(subscriptionObject, null, 2);

    const base64Data = Buffer.from(jsonData).toString("base64");

    const subscriptionRecord = await IPFS.insert(
        {
            base64: base64Data,
            metadata: {
                type: "subscription",
                subscriptionId: paymentData.subscriptionId,
                subscriptionDomain: domainName,
                subscriptionOwner: licenseData.owner || paymentData.customerEmail,
                plan: plan.code,
            },
            name: `${domainName}.subscription`,
            pinIt: true,
        },
        { pro: true }
    );

    return subscriptionRecord;
};

module.exports = {
    searchLicense,
    parseIncludeThemeSettings,
    fetchAndMergeOfficialThemeSettings,
    /** @internal exposed for unit tests — deep-merge used when merging remote theme JSON */
    deepMergeThemeSettingsObjects: _deepMergeThemeObjects,
    normalizeRemoteThemePayload: _normalizeRemoteThemePayload,
    getMyLicense,
    createOrUpdateLicense,
    getUserZelfProof,
    deleteLicense,
    loadOfficialLicenses,
    syncLicenseWithStripe,
    saveSubscriptionRecord,
    // Cache management functions
    clearCache,
    getCacheStats,
};
