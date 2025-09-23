const crypto = require("crypto");
const jwt = require("jsonwebtoken");
const config = require("../../../Core/config");
const moment = require("moment");
const IPFSModule = require("../../IPFS/modules/ipfs.module");
const zelfProofModule = require("../../ZelfProof/modules/zelf-proof.module");
const { generateMnemonic } = require("../../Wallet/modules/helpers");
const OfflineProofModule = require("../../Mina/offline-proof");
const axios = require("axios");

/**
 *
 * @param {Object} params
 * @param {Object} authUser
 * @returns
 */
const get = async (params = {}, authUser = {}) => {
	if (params.email) {
		const emailRecord = await IPFSModule.get({ key: "accountEmail", value: params.email });

		return emailRecord.length ? emailRecord[0] : null;
	}

	if (params.phone) {
		const phoneRecord = await IPFSModule.get({ key: "accountPhone", value: params.phone });

		return phoneRecord.length ? phoneRecord[0] : null;
	}

	// If no specific email/phone, return all client accounts with pagination
	const allClientAccounts = await IPFSModule.get({ key: "accountType", value: "client_account" });

	// Handle pagination if provided
	const page = params.page || 1;
	const limit = params.limit || 10;
	const offset = (page - 1) * limit;

	const paginatedResults = allClientAccounts;

	return {
		data: paginatedResults,
		pagination: {
			page,
			limit,
			total: allClientAccounts.length,
			totalPages: Math.ceil(allClientAccounts.length / limit),
			hasNext: offset + limit < allClientAccounts.length,
			hasPrev: page > 1,
		},
	};
};

/**
 *
 * @param {Object} params
 * @param {Object} authUser
 * @returns
 */
const show = async (params = {}, authUser = {}) => {
	// Use IPFS-based approach instead of MongoDB
	// If specific email or phone is provided, get that specific account
	if (params.email) {
		const emailRecord = await IPFSModule.get({ key: "accountEmail", value: params.email });

		return emailRecord.length ? emailRecord[0] : null;
	}

	if (params.phone) {
		const phoneRecord = await IPFSModule.get({ key: "accountPhone", value: params.phone });

		return phoneRecord.length ? phoneRecord[0] : null;
	}

	// If no specific identifier, return all client accounts
	const allClientAccounts = await IPFSModule.get({ key: "accountType", value: "client_account" });

	// Handle pagination if provided
	const page = params.page || 1;
	const limit = params.limit || 10;
	const offset = (page - 1) * limit;

	const paginatedResults = allClientAccounts.slice(offset, offset + limit);

	return {
		data: paginatedResults,
		pagination: {
			page,
			limit,
			total: allClientAccounts.length,
			totalPages: Math.ceil(allClientAccounts.length / limit),
			hasNext: offset + limit < allClientAccounts.length,
			hasPrev: page > 1,
		},
	};
};

const create = async (data) => {
	// Clean country code to remove any flag emojis (e.g., "🇵🇦 +507" -> "+507")
	const cleanCountryCode = data.countryCode ? data.countryCode.replace(/^[^\d+]*/, "").trim() : data.countryCode;

	const emailRecord = await IPFSModule.get({ key: "accountEmail", value: data.email });

	if (emailRecord.length) throw new Error("403:email_already_exists");

	const phoneRecord = await IPFSModule.get({ key: "accountPhone", value: data.phone });

	if (phoneRecord.length) throw new Error("403:phone_already_exists");

	const apiKey = `zk_${crypto.randomBytes(12).toString("hex").slice(0, 24)}`;

	const zkProof = await OfflineProofModule.createProof(apiKey);

	const { zelfProof } = await zelfProofModule.encrypt({
		publicData: {
			email: data.email,
			company: data.company,
			countryCode: cleanCountryCode,
			phone: data.phone,
		},
		faceBase64: data.faceBase64,
		metadata: {
			apiKey,
			zkProof,
			mnemonic: generateMnemonic(12),
		},
		password: data.masterPassword || undefined,
		identifier: data.email,
		requireLiveness: true,
		tolerance: data.tolerance || "REGULAR",
		verifierKey: config.zelfEncrypt.serverKey,
	});

	// Create JSON data structure for IPFS storage
	const clientData = {
		email: data.email,
		company: data.company,
		countryCode: data.countryCode,
		phone: data.phone,
		language: data.language || "en",
		zelfProof,
		createdAt: new Date().toISOString(),
		version: "1.0.0",
		name: data.name,
		hasPassword: data.masterPassword ? "true" : "false",
	};

	// Convert to JSON string and then to base64
	const jsonData = JSON.stringify(clientData, null, 2);

	const base64Data = Buffer.from(jsonData).toString("base64");

	// Pin the JSON data to IPFS
	const zelfAccount = await IPFSModule.insert(
		{
			base64: base64Data,
			metadata: {
				accountEmail: data.email,
				accountPhone: data.phone,
				accountCompany: data.company,
				accountCountryCode: cleanCountryCode,
				accountType: "client_account",
				accountSubscriptionId: "free",
			},
			name: `${data.email}.account`,
			pinIt: true,
		},
		{ pro: true }
	);

	zelfAccount.publicData.name = data.name;

	return {
		zelfProof,
		zelfAccount,
		ipfsHash: zelfAccount.cid,
		token: jwt.sign(
			{
				email: data.email,
				zkProof,
				exp: moment().add(1, "day").unix(),
			},
			config.JWT_SECRET
		),
	};
};

const update = async (data, authUser) => {
	const { name, email, countryCode, phone, company, faceBase64, masterPassword } = data;

	// Clean country code to remove any flag emojis (e.g., "🇵🇦 +507" -> "+507")
	const cleanCountryCode = countryCode ? countryCode.replace(/^[^\d+]*/, "").trim() : null;

	// validate if the email is taken and it's different from the current email
	const zelfAccount = await get({ email: authUser.email });

	const metadata = zelfAccount.publicData;

	// validate if the email is taken and it's different from the current email
	if (email && zelfAccount && metadata.accountEmail !== email) {
		const emailAccount = await get({ email });

		if (emailAccount) throw new Error("403:email_already_exists");
	}

	if (phone && zelfAccount && metadata.accountPhone !== phone) {
		const phoneAccount = await get({ phone });

		if (phoneAccount) throw new Error("403:phone_already_exists");
	}

	const accountJSON = await axios.get(zelfAccount.url);

	// Decrypt the current zelfAccount to validate biometrics
	const decryptedZelfAccount = await zelfProofModule.decrypt({
		zelfProof: accountJSON.data.zelfProof,
		faceBase64,
		verifierKey: config.zelfEncrypt.serverKey,
		password: masterPassword || undefined,
	});

	if (!decryptedZelfAccount) throw new Error("409:error_decrypting_zelf_account");

	// Unpin the previous IPFS record
	if (zelfAccount.ipfsHash || zelfAccount.ipfs_pin_hash) {
		await IPFSModule.unPinFiles([zelfAccount.ipfsHash || zelfAccount.ipfs_pin_hash]);
	}

	// Create updated client data (same structure as create method)
	const updatedClientData = {
		email: email || metadata.accountEmail,
		company: company || metadata.accountCompany,
		countryCode: cleanCountryCode || metadata.accountCountryCode,
		phone: phone || metadata.accountPhone,
		language: metadata.language || "en",
		zelfProof: accountJSON.data.zelfProof, // Keep the same zelfProof
		createdAt: metadata.createdAt || new Date().toISOString(),
		version: "1.0.0",
		name: name || metadata.accountName,
		hasPassword: metadata.hasPassword || "false",
	};

	// Convert to JSON string and then to base64
	const jsonData = JSON.stringify(updatedClientData, null, 2);

	const base64Data = Buffer.from(jsonData).toString("base64");

	// Create new IPFS record with updated data (same metadata structure as create)
	const newIpfsRecord = await IPFSModule.insert(
		{
			base64: base64Data,
			metadata: {
				accountEmail: updatedClientData.email,
				accountPhone: updatedClientData.phone,
				accountCompany: updatedClientData.company,
				accountCountryCode: updatedClientData.countryCode,
				accountType: "client_account",
				accountSubscriptionId: "free",
				accountName: updatedClientData.name,
			},
			name: `${updatedClientData.email}.account`,
			pinIt: true,
		},
		{ pro: true }
	);

	// Return updated zelfAccount data
	return {
		zelfProof: accountJSON.data.zelfProof,
		zelfAccount: {
			...zelfAccount,
			ipfsHash: newIpfsRecord.IpfsHash,
			url: newIpfsRecord.url,
			publicData: newIpfsRecord.publicData,
		},
		ipfsHash: newIpfsRecord.IpfsHash,
		message: "Account updated successfully",
	};
};

const destroy = async (data, authUser) => {};

/**
 * authenticate a client
 * @param {Object} data
 * @param {Object} authUser
 * @returns {Object}
 */
const auth = async (data, authUser) => {
	const { email, countryCode, phone, faceBase64, masterPassword } = data;

	const zelfAccount = await get({ email, countryCode, phone });

	const accountJSON = await axios.get(zelfAccount.url);

	if (!accountJSON.data?.zelfProof) throw new Error("409:account_doesnt_contain_zelf_proof");

	const decryptedZelfAccount = await zelfProofModule.decrypt({
		zelfProof: accountJSON.data.zelfProof,
		faceBase64,
		verifierKey: config.zelfEncrypt.serverKey,
		password: masterPassword || undefined,
	});

	if (!decryptedZelfAccount) throw new Error("409:error_decrypting_zelf_account");

	zelfAccount.publicData.name = accountJSON.data.name;

	return {
		zelfProof: accountJSON.data.zelfProof,
		zelfAccount,
		ipfsHash: zelfAccount.cid,
		zkProof: decryptedZelfAccount.metadata.zkProof,
		apiKey: decryptedZelfAccount.metadata.apiKey,
		token: jwt.sign(
			{
				email: data.email,
				exp: moment().add(30, "day").unix(),
			},
			config.JWT_SECRET
		),
	};
};

/**
 * Update client password
 * @param {Object} data
 * @param {Object} authUser
 * @returns {Object}
 */
const updatePassword = async (data, authUser) => {
	const { newPassword, confirmPassword, faceBase64, masterPassword } = data;

	// Verify passwords match (this should already be validated in middleware, but double-check)
	if (newPassword !== confirmPassword) {
		throw new Error("409:passwords_do_not_match");
	}

	// Get the current client account
	const zelfAccount = await get({ email: authUser.email });

	if (!zelfAccount) throw new Error("404:client_not_found");

	const accountJSON = await axios.get(zelfAccount.url);

	if (!accountJSON.data?.zelfProof) throw new Error("409:account_doesnt_contain_zelf_proof");

	const metadata = zelfAccount.publicData;

	// Decrypt the current zelfAccount to verify master password and get current data
	const decryptedZelfAccount = await zelfProofModule.decrypt({
		zelfProof: accountJSON.data.zelfProof,
		faceBase64,
		verifierKey: config.zelfEncrypt.serverKey,
		password: masterPassword,
	});

	if (!decryptedZelfAccount) throw new Error("409:verification_failed");

	// Update the password in the decrypted account data
	const updatedAccountData = {
		...decryptedZelfAccount,
		metadata: {
			...decryptedZelfAccount.metadata,
			hasPassword: "true",
		},
	};

	// Re-encrypt the account with the new password
	const { zelfProof } = await zelfProofModule.encrypt({
		publicData: {
			email: metadata.accountEmail,
			company: metadata.accountCompany,
			countryCode: metadata.accountCountryCode,
			phone: metadata.accountPhone,
		},
		metadata: decryptedZelfAccount.metadata,
		identifier: metadata.accountEmail,
		faceBase64,
		verifierKey: config.zelfEncrypt.serverKey,
		password: newPassword,
	});

	zelfAccount.publicData.name = accountJSON.data.name;

	// get the data from the JSON inside the zelfAccount.url
	const _jsonData = await axios.get(zelfAccount.url);

	const ZelfAccount_JSON = _jsonData.data;

	const newZelfAccountJSON = {
		...metadata,
		...ZelfAccount_JSON,
		zelfProof,
		hasPassword: "true",
	};

	// delete the previous ipfs record
	await IPFSModule.unPinFiles([zelfAccount.ipfsHash]);

	// Convert to JSON string and then to base64
	const jsonData = JSON.stringify(newZelfAccountJSON, null, 2);

	const base64Data = Buffer.from(jsonData).toString("base64");

	// Create new IPFS record with updated data
	const newIpfsRecord = await IPFSModule.insert(
		{
			base64: base64Data,
			metadata,
			name: `${authUser.email}.account`,
			pinIt: true,
		},
		{ pro: true }
	);

	// Return updated zelfAccount data
	return {
		zelfProof,
		zelfAccount: {
			...zelfAccount,
			ipfsHash: newIpfsRecord.IpfsHash,
			url: newIpfsRecord.url,
			publicData: newIpfsRecord.publicData,
		},
		ipfsHash: newIpfsRecord.IpfsHash,
		message: "Password updated successfully",
	};
};

module.exports = {
	get,
	show,
	create,
	update,
	destroy,
	auth,
	updatePassword,
};
