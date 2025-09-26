const axios = require("../../../Core/axios").getEncryptionInstance();
const config = require("../../../Core/config");
const IPFS = require("../../../Repositories/IPFS/modules/ipfs.module");
const ClientModule = require("../../Client/modules/client.module");
const { decrypt } = require("../../ZelfProof/modules/zelf-proof.module");
const moment = require("moment");
const fs = require("fs");
const path = require("path");

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

		const cacheContent = fs.readFileSync(CACHE_FILE_PATH, "utf8");
		const cacheData = JSON.parse(cacheContent);

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
		// Ensure cache directory exists
		const cacheDir = path.dirname(CACHE_FILE_PATH);
		if (!fs.existsSync(cacheDir)) {
			fs.mkdirSync(cacheDir, { recursive: true });
		}

		const cacheData = {
			timestamp: moment().toISOString(),
			licenses: licenses,
		};

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
const getMyLicense = async (jwt) => {
	// Get client data to get the zelfProof
	const client = await ClientModule.get({ email: jwt.email });

	if (!client) throw new Error("404:client_not_found");

	const metadata = client.publicData;

	// Search for all licenses with the same zelfProof
	const myRecords = await IPFS.get({ key: "licenseEmail", value: metadata.accountEmail });

	const myLicenses = [];

	for (const record of myRecords) {
		if (record.publicData.type === "license") {
			myLicenses.push(record);
		}
	}

	return { myLicense: myLicenses.length ? myLicenses[0] : null, zelfAccount: client };
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
 * Create or update license
 * @param {Object} body - Request body
 * @param {Object} user - User object
 * @returns {Object} - License data
 */
const createOrUpdateLicense = async (body, jwt) => {
	const { faceBase64, masterPassword, domainConfig } = body;

	try {
		const { myLicense, zelfAccount } = await getMyLicense(jwt);

		const accountJSON = await axios.get(zelfAccount.url);

		const accountZelfProof = accountJSON.data.zelfProof;

		// now we should validate if the zelfAccount is the owner of the license with the decrypted zelfProof
		const decryptedZelfProof = await decrypt({
			zelfProof: accountZelfProof,
			faceBase64,
			password: masterPassword || undefined,
			verifierKey: config.zelfEncrypt.serverKey,
		});

		// validate if the domain being passed is registered or not because we need to compare the domain with the previous domain
		await _checkIfDomainIsRegistered(body.domain, accountZelfProof);

		if (myLicense) {
			// we will delete the previous license
			await IPFS.unPinFiles([myLicense.ipfs_pin_hash]);
		}

		const licenseMetadata = {
			...domainConfig,
			licenseType: domainConfig.type,
			type: "license",
			subscriptionId: "free",
			previousDomain: myLicense?.publicData.domain || "",
			domain: body.domain,
			owner: jwt.email,
			zelfProof: accountZelfProof,
			expiresAt: moment().add(1, "year").toISOString(),
		};

		const jsonData = JSON.stringify({ ...licenseMetadata }, null, 2);

		const base64Data = Buffer.from(jsonData).toString("base64");

		const license = await IPFS.insert(
			{
				base64: base64Data,
				metadata: {
					type: "license",
					licenseType: domainConfig.type,
					licenseSubscriptionId: "free",
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
const deleteLicense = async (params, user) => {
	try {
		const { ipfsHash } = params;
		const userEmail = user?.email;

		if (!userEmail) {
			throw new Error("401:User not authenticated");
		}

		// Verify ownership before deletion
		const license = await searchLicenseByHash(ipfsHash);
		if (!license || license.owner !== userEmail) {
			throw new Error("403:Access denied - License not found or belongs to another user");
		}

		// Unpin from IPFS
		await IPFS.unpin(ipfsHash);

		return {
			success: true,
			message: "License deleted successfully",
		};
	} catch (error) {
		console.error("Delete license error:", error);
		throw error;
	}
};

/**
 * Search license by IPFS hash
 */
const searchLicenseByHash = async (ipfsHash) => {
	try {
		const response = await IPFS.getPin(ipfsHash);

		if (response.data) {
			const licenseData = response.data;
			return {
				domain: licenseData.publicData.domain,
				ipfsHash: licenseData.ipfs_pin_hash,
				owner: licenseData.publicData.owner,
				zelfProof: licenseData.publicData.licenseZelfProof,
				createdAt: licenseData.date_pinned,
				updatedAt: licenseData.date_pinned,
			};
		}

		return null;
	} catch (error) {
		console.error("Search license by hash error:", error);
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
const _checkIfDomainIsRegistered = async (domain, zelfProof) => {
	// Search for all licenses with the same zelfProof
	const domains = await IPFS.get({ key: "licenseDomain", value: domain });

	if (!domains.length) return;

	const foundDomain = domains[0];

	if (foundDomain.publicData.licenseZelfProof !== zelfProof) throw new Error("409:domain_already_registered");
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
	const officialLicenses = await IPFS.get({ key: "licenseType", value: "official" });

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

module.exports = {
	searchLicense,
	getMyLicense,
	createOrUpdateLicense,
	getUserZelfProof,
	deleteLicense,
	searchLicenseByHash,
	loadOfficialLicenses,
};
