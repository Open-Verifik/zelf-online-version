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

// Initialize cache with 1 hour TTL and check period of 10 minutes
const licenseCache = initCacheInstance();
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
			`Official licenses cached successfully (${licenses.length} licenses, TTL: ${
				licenseCache.getTtl("official-licenses") ? Math.round((licenseCache.getTtl("official-licenses") - Date.now()) / 1000) : "N/A"
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
	const { domain, withJSON = true } = query;

	if (domain) {
		const existingLicense = await IPFS.get({ key: "licenseDomain", value: domain });

		if (!existingLicense.length) throw new Error("404:license_not_found");

		const licenseRecord = existingLicense[0];

		// Fetch the complete JSON content from IPFS URL if requested
		if (withJSON) {
			try {
				const jsonResponse = await axios.get(licenseRecord.url);
				licenseRecord.domainConfig = jsonResponse.data;
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
			} catch (error) {
				console.error(`Error getting license JSON for ${license.id}:`, error);
				// Continue with other licenses even if one fails
			}
		}
	}

	return allLicenses;
};

/**
 * Get user's own licenses
 * @param {Object} query - Query parameters
 * @param {Object} jwt - JWT object
 * @returns {Array} - Array of user's licenses
 */
const getMyLicense = async (jwt, withJSON = false, ownershipCredentials) => {
	// Get client data to get the zelfProof
	const client = await ClientModule.get({ email: jwt.email });

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

	// Search for all licenses with the same zelfProof
	const myRecords = await IPFS.get({ key: "licenseOwner", value: metadata.accountEmail });

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

	return { myLicense: myLicenses.length ? myLicenses[0] : null, zelfAccount: client, accountZelfProof, accountJSON };
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
 * Create or update license
 * @param {Object} body - Request body
 * @param {Object} user - User object
 * @returns {Object} - License data
 */
const createOrUpdateLicense = async (body, jwt) => {
	const { faceBase64, masterPassword, domainConfig } = body;

	try {
		const { myLicense, zelfAccount, accountZelfProof } = await getMyLicense(jwt, false, { faceBase64, masterPassword });

		// validate if the domain being passed is registered or not because we need to compare the domain with the previous domain
		await _checkIfDomainIsRegistered(body.domain, zelfAccount.publicData.accountEmail);

		if (myLicense) await TagsIPFSModule.unPinFiles([myLicense.id]);

		// Filter domain config to only include user-modifiable fields
		const filteredDomainConfig = filterUserModifiableFields(domainConfig, myLicense);

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
 */
const loadOfficialLicenses = async (force = false) => {
	// Try to get from cache first (unless forced)
	if (!force) {
		const cachedData = loadCache();
		if (cachedData) {
			return cachedData;
		}
	}

	console.info("Loading official licenses from IPFS...");

	try {
		// Fetch from IPFS
		const officialLicenses = await IPFS.get({ key: "type", value: "license" });

		const licenses = [];

		for (const license of officialLicenses) {
			try {
				const licenseData = await _loadLicenseJSON(license.url);
				licenses.push(licenseData);
			} catch (error) {
				console.error(`Error loading license ${license.id}:`, error.message);
				// Continue with other licenses
			}
		}

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

const syncLicenseWithStripe = async (license, paymentData) => {
	// first we need to
	const licenseData = license
		? await _loadLicenseJSON(license.url)
		: {
				owner: paymentData.customerEmail,
				type: "license",
				status: "active",
				description: `License for ${paymentData.customerEmail}`,
				features: [
					{
						name: "Zelf Name Service",
						code: "zns",
						description: "Encryptions, Decryptions, previews of ZelfProofs",
						enabled: true,
					},
					{
						name: "Zelf Keys",
						code: "zelfkeys",
						description: "Zelf Keys: Passwords, Notes, Credit Cards, etc.",
						enabled: true,
					},
				],
				tags: {
					minLength: 3,
					maxLength: 50,
					allowedChars: /^[a-zA-Z0-9][a-zA-Z0-9-]*[a-zA-Z0-9]$/,
					reserved: ["www", "api", "admin", "support", "help"],
					customRules: [],
					payment: {
						methods: ["coinbase", "crypto", "stripe"],
						currencies: ["BDAG", "BTC", "ETH", "SOL", "USDT"],
						discounts: {
							yearly: 0.1,
							lifetime: 0.2,
						},
						rewardPrice: 10,
						whitelist: {},
						pricingTable: {},
					},
					storage: {
						// Moved storage inside tags
						keyPrefix: "tagName",
						ipfsEnabled: true,
						arweaveEnabled: true,
						walrusEnabled: true,
						backupEnabled: false,
					},
				},
				zelfkeys: {
					plans: [],
					payment: {
						whitelist: {},
						pricingTable: {},
					},
					storage: {
						// Moved storage inside zelfkeys
						keyPrefix: "tagName",
						ipfsEnabled: true,
						arweaveEnabled: true,
						walrusEnabled: true,
						backupEnabled: false,
					},
				},
				metadata: {
					launchDate: moment().format("YYYY-MM-DD"),
					version: "1.0.0",
					documentation: "https://docs.zelf.world",
					support: "standard",
				},
		  };

	const plan = DefaultLicenseValues.findPlanByPrice(paymentData.amountPaid);

	const licenseObject = new Domain(licenseData);

	console.log({ paymentData });

	licenseObject.limits = plan.limits;
	licenseObject.subscriptionId = paymentData.subscriptionId;
	licenseObject.startDate = moment(new Date(paymentData.subscription.current_period_start * 1000)).format("YYYY-MM-DD HH:mm:ss");
	licenseObject.endDate = moment(new Date(paymentData.subscription.current_period_end * 1000)).format("YYYY-MM-DD HH:mm:ss");
	licenseObject.expiresAt = moment(new Date(paymentData.subscription.current_period_end * 1000))
		.add(15, "days")
		.format("YYYY-MM-DD HH:mm:ss");

	licenseObject.stripe = {
		subscriptionId: paymentData.subscriptionId,
		customerId: paymentData.customerId,
		productId: paymentData.subscription.items?.data[0]?.plan?.product,
		priceId: paymentData.priceId,
		latestInvoiceId: paymentData.invoiceId,
		amountPaid: paymentData.amountPaid,
		paidAt: paymentData.paidAt,
		status: paymentData.status,
	};

	// now we will create it with the new details

	await TagsIPFSModule.unPinFiles([license.id]);

	const jsonData = JSON.stringify(licenseObject.toJSON(), null, 2);

	const base64Data = Buffer.from(jsonData).toString("base64");

	const licenseUpdated = await IPFS.insert(
		{
			base64: base64Data,
			metadata: {
				type: "license",
				licenseType: plan.code,
				licenseSubscriptionId: paymentData.subscriptionId,
				licenseDomain: licenseObject.name,
				licenseOwner: licenseData.owner,
			},
			name: `${licenseObject.name}.license`,
			pinIt: true,
		},
		{ pro: true }
	);

	return licenseUpdated;
};

module.exports = {
	searchLicense,
	getMyLicense,
	createOrUpdateLicense,
	getUserZelfProof,
	deleteLicense,
	loadOfficialLicenses,
	syncLicenseWithStripe,
	// Cache management functions
	clearCache,
	getCacheStats,
};
