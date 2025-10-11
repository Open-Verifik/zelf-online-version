const axios = require("../../../Core/axios").getEncryptionInstance();
const config = require("../../../Core/config");
const IPFS = require("../../../Repositories/IPFS/modules/ipfs.module");
const ClientModule = require("../../Client/modules/client.module");
const { decrypt } = require("../../ZelfProof/modules/zelf-proof.module");
const moment = require("moment");
const fs = require("fs");
const path = require("path");
const TagsIPFSModule = require("../../Tags/modules/tags-ipfs.module");
const DefaultLicenseValues = require("./default-license.values");
const { Domain } = require("../../Tags/modules/domain.class");
const CACHE_DOMAINS = {};
// Cache file path for development mode
const CACHE_FILE_PATH = path.join(__dirname, "../../../cache/official-licenses-cache.json");

/**
 * Check if cache is valid (less than 1 hour old)
 * @param {Object} cacheData - Cache data object
 * @returns {boolean} - Whether cache is valid
 */
const isCacheValid = (cacheData) => {
	if (!cacheData || !cacheData.timestamp) return false;

	const cacheTime = moment(cacheData.timestamp);
	const oneHourAgo = moment().subtract(1, "hour");

	return cacheTime.isAfter(oneHourAgo);
};

/**
 * Load cache from file
 * @returns {Object|null} - Cache data or null if not found/invalid
 */
const loadCache = () => {
	try {
		if (!fs.existsSync(CACHE_FILE_PATH)) return null;

		const cacheContent = CACHE_DOMAINS.timestamp ? CACHE_DOMAINS : fs.readFileSync(CACHE_FILE_PATH, "utf8");

		const cacheData = CACHE_DOMAINS.timestamp ? CACHE_DOMAINS : JSON.parse(cacheContent);

		CACHE_DOMAINS.timestamp = cacheData.timestamp;

		CACHE_DOMAINS.licenses = cacheData.licenses;

		return isCacheValid(cacheData) ? cacheData : null;
	} catch (error) {
		console.error("Error loading cache:", error);
		return null;
	}
};

/**
 * Save cache to file
 * @param {Array} licenses - License data to cache
 */
const saveCache = (licenses) => {
	try {
		const cacheDir = path.dirname(CACHE_FILE_PATH);
		if (!fs.existsSync(cacheDir)) {
			fs.mkdirSync(cacheDir, { recursive: true });
		}

		const cacheData = {
			timestamp: moment().toISOString(),
			licenses: licenses,
		};

		CACHE_DOMAINS.timestamp = cacheData.timestamp;

		CACHE_DOMAINS.licenses = cacheData.licenses;

		fs.writeFileSync(CACHE_FILE_PATH, JSON.stringify(cacheData, null, 2));
		console.log("Official licenses cache saved successfully");
	} catch (error) {
		console.error("Error saving cache:", error);
	}
};

/**
 * Search for license by domain
 * @param {Object} query - Query parameters
 * @param {Object} user - User object
 * @returns {Object} - License data or null
 */
const searchLicense = async (query, user) => {
	const { domain } = query;

	if (domain) {
		const existingLicense = await IPFS.get({ key: "licenseDomain", value: domain });

		if (!existingLicense.length) throw new Error("404:license_not_found");

		return existingLicense[0];
	}

	return IPFS.get({ key: "type", value: "license" });
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
 * Load official licenses
 */
const loadOfficialLicenses = async () => {
	const cachedData = loadCache();

	if (cachedData) {
		console.info("Loading official licenses from cache");
		return cachedData.licenses;
	}

	// Fetch from IPFS
	const officialLicenses = await IPFS.get({ key: "type", value: "license" });

	const licenses = [];

	for (const license of officialLicenses) {
		const licenseData = await _loadLicenseJSON(license.url);
		licenses.push(licenseData);
	}

	saveCache(licenses);

	return licenses;
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

	licenseObject.limits = plan.limits;
	licenseObject.subscriptionId = paymentData.subscriptionId;
	licenseObject.startDate = moment(new Date(paymentData.subscription.current_period_start * 1000)).format("YYYY-MM-DD HH:mm:ss");
	licenseObject.endDate = moment(new Date(paymentData.subscription.current_period_end * 1000)).format("YYYY-MM-DD HH:mm:ss");
	licenseObject.expiresAt = moment(new Date(paymentData.subscription.current_period_end * 1000))
		.add(15, "days")
		.format("YYYY-MM-DD HH:mm:ss");

	licenseObject.stripe = {
		productId: paymentData.productId,
		priceId: paymentData.priceId,
		latestInvoiceId: paymentData.invoiceId,
		amountPaid: paymentData.amountPaid,
		paidAt: paymentData.paidAt,
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
	CACHE_DOMAINS,
	searchLicense,
	getMyLicense,
	createOrUpdateLicense,
	getUserZelfProof,
	deleteLicense,
	loadOfficialLicenses,
	syncLicenseWithStripe,
};
