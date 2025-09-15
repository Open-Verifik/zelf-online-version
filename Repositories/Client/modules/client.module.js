const Model = require("../models/client.model");
const MongoORM = require("../../../Core/mongo-orm");
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
	if (params.email) {
		const emailRecord = await IPFSModule.get({ key: "email", value: params.email });

		if (emailRecord.length) return emailRecord[0];
	}

	if (params.phone) {
		const phoneRecord = await IPFSModule.get({ key: "phone", value: params.phone });

		if (phoneRecord.length) return phoneRecord[0];
	}

	throw new Error("404:client_not_found");
};

const show = async (params = {}, authUser = {}) => {
	let queryParams = {
		findOne: true,
		...params,
	};

	if (params.id || params._id) {
		queryParams.where__id = params.id || params._id;
	}

	if (authUser?.superAdminId) {
		queryParams.where__id = authUser.superAdminId;
	}

	return await MongoORM.buildQuery(queryParams, Model, null, populates);
};

const create = async (data) => {
	const emailRecord = await IPFSModule.get({ key: "email", value: data.email });

	if (emailRecord.length) throw new Error("403:email_already_exists");

	const phoneRecord = await IPFSModule.get({ key: "phone", value: data.phone });

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
				email: data.email,
				phone: data.phone,
				company: data.company,
				countryCode: data.countryCode,
				zelfProof,
				type: "client_account",
				subscriptionId: "free",
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
	const { clientId } = authUser;

	const record = await Model.findOne({ _id: clientId });

	if (!record) throw new Error("404");

	if (data.increaseApiUsage) {
		if (!record.apiUsage) record.apiUsage = 0;

		record.apiUsage += 1;
	}

	await record.save();
};

const destroy = async (data, authUser) => {};

const auth = async (data, authUser) => {
	const { email, countryCode, phone, faceBase64, masterPassword } = data;

	const zelfAccount = await get({ email, countryCode, phone });

	const metadata = zelfAccount.metadata.keyvalues;

	const decryptedZelfAccount = await zelfProofModule.decrypt({
		zelfProof: metadata.zelfProof,
		faceBase64,
		verifierKey: config.zelfEncrypt.serverKey,
		password: masterPassword || undefined,
	});

	if (!decryptedZelfAccount) throw new Error("409:error_decrypting_zelf_account");

	// from the zelfAccount.url we should get the json from that then asisgn the name to the zelfAccount.metadata.keyvalues.name
	const jsonData = await axios.get(zelfAccount.url);

	zelfAccount.metadata.keyvalues.name = jsonData.data.name;

	return {
		zelfProof: metadata.zelfProof,
		zelfAccount,
		ipfsHash: zelfAccount.cid,
		zkProof: decryptedZelfAccount.metadata.zkProof,
		apiKey: decryptedZelfAccount.metadata.apiKey,
		token: jwt.sign(
			{
				email: data.email,
				exp: moment().add(1, "day").unix(),
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
