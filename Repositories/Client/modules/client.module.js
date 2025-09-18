const crypto = require("crypto");
const jwt = require("jsonwebtoken");
const config = require("../../../Core/config");
const moment = require("moment");
const IPFSModule = require("../../IPFS/modules/ipfs.module");
const zelfProofModule = require("../../ZelfProof/modules/zelf-proof.module");
const { generateMnemonic } = require("../../Wallet/modules/helpers");
const OfflineProofModule = require("../../Mina/offline-proof");
const axios = require("axios");

const get = async (params = {}, authUser = {}) => {
	// If specific email or phone is provided, get that specific account
	if (params.email) {
		const emailRecord = await IPFSModule.get({ key: "accountEmail", value: params.email });
		if (emailRecord.length) return emailRecord[0];
	}

	if (params.phone) {
		const phoneRecord = await IPFSModule.get({ key: "accountPhone", value: params.phone });
		if (phoneRecord.length) return phoneRecord[0];
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

const show = async (params = {}, authUser = {}) => {
	// Use IPFS-based approach instead of MongoDB
	// If specific email or phone is provided, get that specific account
	if (params.email) {
		const emailRecord = await IPFSModule.get({ key: "accountEmail", value: params.email });
		if (emailRecord.length) return emailRecord[0];
	}

	if (params.phone) {
		const phoneRecord = await IPFSModule.get({ key: "accountPhone", value: params.phone });
		if (phoneRecord.length) return phoneRecord[0];
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
			countryCode: data.countryCode,
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
				accountCountryCode: data.countryCode,
				accountZelfProof: zelfProof,
				accountType: "client_account",
				accountSubscriptionId: "free",
			},
			name: `${data.email}.account`,
			pinIt: true,
		},
		{ pro: true }
	);

	zelfAccount.metadata.name = data.name;

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

	// Handle profile update with biometric verification
	if (faceBase64 && masterPassword) {
		// Get the current zelfAccount from IPFS using email
		const zelfAccount = await get({ email });

		if (!zelfAccount) throw new Error("404:zelf_account_not_found");

		const metadata = zelfAccount.metadata.keyvalues;

		// Decrypt the current zelfAccount to validate biometrics
		const decryptedZelfAccount = await zelfProofModule.decrypt({
			zelfProof: metadata.accountZelfProof,
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
			email: email || metadata.email,
			company: company || metadata.company,
			countryCode: countryCode || metadata.countryCode,
			phone: phone || metadata.phone,
			language: metadata.language || "en",
			zelfProof: metadata.accountZelfProof, // Keep the same zelfProof
			createdAt: metadata.createdAt || new Date().toISOString(),
			version: "1.0.0",
			name: name || metadata.name,
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
					accountZelfProof: metadata.accountZelfProof,
					accountType: "client_account",
					accountSubscriptionId: "free",
				},
				name: `${updatedClientData.email}.account`,
				pinIt: true,
			},
			{ pro: true }
		);

		// Return updated zelfAccount data
		return {
			zelfProof: metadata.accountZelfProof,
			zelfAccount: {
				...zelfAccount,
				ipfsHash: newIpfsRecord.ipfsHash || newIpfsRecord.ipfs_pin_hash,
				url: newIpfsRecord.url,
				metadata: {
					...zelfAccount.metadata,
					name: updatedClientData.name,
				},
			},
			ipfsHash: newIpfsRecord.ipfsHash || newIpfsRecord.ipfs_pin_hash,
		};
	}

	throw new Error("400:biometric_verification_required");
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

	const metadata = zelfAccount.metadata.keyvalues;

	const decryptedZelfAccount = await zelfProofModule.decrypt({
		zelfProof: metadata.accountZelfProof,
		faceBase64,
		verifierKey: config.zelfEncrypt.serverKey,
		password: masterPassword || undefined,
	});

	if (!decryptedZelfAccount) throw new Error("409:error_decrypting_zelf_account");

	// from the zelfAccount.url we should get the json from that then asisgn the name to the zelfAccount.metadata.keyvalues.name
	const jsonData = await axios.get(zelfAccount.url);

	zelfAccount.metadata.keyvalues.name = jsonData.data.name;

	zelfAccount.metadata = { ...zelfAccount.metadata, ...zelfAccount.metadata.keyvalues, keyvalues: undefined };

	return {
		zelfProof: metadata.accountZelfProof,
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

module.exports = {
	get,
	show,
	create,
	update,
	destroy,
	auth,
};
