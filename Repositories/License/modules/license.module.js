const axios = require("../../../Core/axios").getEncryptionInstance();
const config = require("../../../Core/config");
const IPFS = require("../../../Repositories/IPFS/modules/ipfs.module");
const ClientModule = require("../../Client/modules/client.module");
const { decrypt } = require("../../ZelfProof/modules/zelf-proof.module");
const moment = require("moment");

/**
 * Search for license by domain
 * @param {Object} query - Query parameters
 * @param {Object} user - User object
 * @returns {Object} - License data or null
 */
const searchLicense = async (query, user) => {
	const { domain } = query;

	const existingLicense = await IPFS.get({ key: "domain", value: domain });

	if (!existingLicense.length) throw new Error("404:license_not_found");

	return existingLicense[0];
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

	const metadata = client.metadata.keyvalues;

	// Search for all licenses with the same zelfProof
	const myRecords = await IPFS.get({ key: "zelfProof", value: metadata.zelfProof });

	const myLicenses = [];

	for (const record of myRecords) {
		if (record.metadata.keyvalues.type === "license") {
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
	const { faceBase64 } = body;

	try {
		const { myLicense, zelfAccount } = await getMyLicense(jwt);

		console.log({ myLicense, zelfAccount, zelfProof: zelfAccount.metadata.keyvalues.zelfProof });

		// now we should validate if the zelfAccount is the owner of the license with the decrypted zelfProof
		const decryptedZelfProof = await decrypt({
			zelfProof: zelfAccount.metadata.keyvalues.zelfProof,
			faceBase64,
			verifierKey: config.zelfEncrypt.serverKey,
		});

		if (myLicense) {
			// we will delete the previous license
			// await IPFS.unPinFiles([myLicense.ipfs_pin_hash]);
		}

		const licenseMetadata = {
			type: "license",
			domain: body.domain,
			owner: jwt.email,
			zelfProof: zelfAccount.metadata.keyvalues.zelfProof,
			expiresAt: moment().add(1, "year").toISOString(),
		};

		const jsonData = JSON.stringify({ ...licenseMetadata }, null, 2);

		const base64Data = Buffer.from(jsonData).toString("base64");

		const license = await IPFS.insert(
			{
				base64: base64Data,
				metadata: licenseMetadata,
				name: `${body.domain}.license`,
				pinIt: true,
			},
			{ pro: true }
		);

		return license;
	} catch (error) {
		console.error("Create/Update license error:", error);
		throw error;
	}
};

/**
 * Create new license
 * @param {Object} licenseData - License data
 * @returns {Object} - Created license
 */
const createLicense = async (licenseData) => {
	try {
		const { domain, faceBase64, zelfProof, userEmail } = licenseData;

		// Create license metadata for IPFS
		const licenseMetadata = {
			name: `${domain}.license`,
			keyvalues: {
				type: "license",
				domain: domain,
				owner: userEmail,
				zelfProof: zelfProof,
				createdAt: new Date().toISOString(),
			},
		};

		// Store license data in IPFS
		const ipfsResponse = await IPFS.pinJSONToIPFS({
			domain,
			owner: userEmail,
			zelfProof,
			createdAt: new Date().toISOString(),
			metadata: licenseMetadata,
		});

		return {
			domain,
			ipfsHash: ipfsResponse.IpfsHash,
			owner: userEmail,
			zelfProof,
			createdAt: new Date().toISOString(),
			updatedAt: new Date().toISOString(),
		};
	} catch (error) {
		console.error("Create license error:", error);
		throw error;
	}
};

/**
 * Update existing license
 */
const updateLicense = async (licenseData) => {
	try {
		const { domain, faceBase64, masterPassword, zelfProof, userEmail, existingIpfsHash } = licenseData;

		// Delete previous IPFS record
		if (existingIpfsHash) {
			await IPFS.unpin(existingIpfsHash);
		}

		// Create new license with updated data
		return await createLicense({
			domain,
			faceBase64,
			masterPassword,
			zelfProof,
			userEmail,
		});
	} catch (error) {
		console.error("Update license error:", error);
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
				domain: licenseData.metadata.keyvalues.domain,
				ipfsHash: licenseData.ipfs_pin_hash,
				owner: licenseData.metadata.keyvalues.owner,
				zelfProof: licenseData.metadata.keyvalues.zelfProof,
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

module.exports = {
	searchLicense,
	getMyLicense,
	createOrUpdateLicense,
	getUserZelfProof,
	createLicense,
	updateLicense,
	deleteLicense,
	searchLicenseByHash,
};
