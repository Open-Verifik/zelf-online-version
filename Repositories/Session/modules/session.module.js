const fs = require("fs");
let armoredPublicKey = null;
let secretKey = "your-secret-key";
let passphrase = "something-seom";
const openpgp = require("openpgp");
const Model = require("../models/session.model");
const jwt = require("jsonwebtoken");
const config = require("../../../Core/config");
const PGPKeyModule = require("../../PGP/modules/pgp-keys.module");
const MongoORM = require("../../../Core/mongo-orm");
const moment = require("moment");
const populates = [];

/**
 * @param {*} params
 * @param {*} authUser
 */
const get = async (params, authUser = {}) => {
	const queryParams = {
		...params,
	};

	if (authUser.identifier) {
		queryParams.where_identifier = authUser.identifier;
	}

	if (authUser.type) {
		queryParams.where_type = authUser.type;
	}

	return await MongoORM.buildQuery(queryParams, Model, null, populates);
};

/**
 * @param {*} params
 */
const insert = async (params) => {
	const queryParams = {
		findOne: true,
	};

	if (config.env === "development") {
		queryParams.where_identifier = params.identifier || params.clientIP;
	} else {
		queryParams.where_clientIP = params.clientIP;
	}

	const existingSession = await get(queryParams);

	if (existingSession) {
		return {
			token: jwt.sign(
				{
					session: existingSession._id,
					identifier: existingSession.identifier,
					ip: existingSession.clientIP,
				},
				config.JWT_SECRET
			),
			activatedAt: moment(existingSession.activatedAt).utc().unix(),
			expiresAt: moment(existingSession.activatedAt).utc().add(10, "minutes").unix(),
		};
	}

	const session = new Model({
		identifier: params.identifier || params.clientIP,
		clientIP: params.clientIP,
		type: params.type || "general",
		status: "active",
		isWebExtension: params.isWebExtension || false,
	});

	try {
		await session.save();
	} catch (exception) {
		console.error({
			exception,
			identifier: params.clientIP,
			...session,
		});
		const error = new Error("session_duplication");

		error.status = 409;

		throw error;
	}

	return {
		token: jwt.sign(
			{
				session: session._id,
				identifier: session.identifier,
				ip: session.clientIP,
			},
			config.JWT_SECRET
		),
		activatedAt: moment(session.activatedAt).utc().unix(),
		expiresAt: moment(session.activatedAt).utc().add(10, "minutes").unix(),
	};
};

const extractPublicKey = async (params) => {
	const identifier = config.env === "development" ? params.identifier : params.clientIP;

	const storedKey = await PGPKeyModule.findKey(identifier); // uuid

	if (storedKey) return storedKey.publicKey;

	const pgpRecord = await PGPKeyModule.generateKey("session", identifier, params.name, params.email, params.password);

	return pgpRecord.publicKey;
};

/**
 *
 * @param {*} params
 */
const getPublicKey = async (params) => {
	const { privateKey, publicKey } = await openpgp.generateKey({
		type: "ecc", // Type of the key, e.g., 'ecc' (Elliptic Curve)
		curve: "curve25519", // Curve to use for ECC
		userIDs: [{ name: params.name || "Wallet", email: params.email || "wallet@zelf.world" }],
		passphrase,
	});

	secretKey = privateKey;

	armoredPublicKey = publicKey;

	return { publicKey, params };
};

const decryptContent = async (params, identifier) => {
	const { message: encryptedMessage } = params;

	try {
		const privateKey = await openpgp.readPrivateKey({ armoredKey: secretKey });

		const decryptedPrivateKey = await openpgp.decryptKey({
			privateKey,
			passphrase,
		});

		// Read the encrypted message
		const message = await openpgp.readMessage({
			armoredMessage: encryptedMessage,
		});

		// Decrypt the message
		const { data: decrypted } = await openpgp.decrypt({
			message,
			decryptionKeys: decryptedPrivateKey,
		});

		return decrypted;
	} catch (error) {
		console.error("Error during decryption:", { error });

		throw new Error("decryption_failed");
	}
};

const encryptContent = async (message) => {
	if (!armoredPublicKey) return null;

	const publicKey = await openpgp.readKey({ armoredKey: armoredPublicKey });

	// Encrypt the message
	const encryptedMessage = await openpgp.encrypt({
		message: await openpgp.createMessage({ text: JSON.stringify(message) }),
		encryptionKeys: publicKey,
	});

	return encryptedMessage;
};

const _getPrivateKey = async (authUser) => {
	const pgpRecord = await PGPKeyModule.findKey(null, authUser);

	if (!pgpRecord) throw new Error("key_not_found");

	const privateKey = await PGPKeyModule.decryptKey(pgpRecord.type, pgpRecord.key);

	return privateKey;
};

const sessionDecrypt = async (content, authUser) => {
	if (!content) return null;

	let privateKey = null;
	try {
		privateKey = await _getPrivateKey(authUser);

		const decryptedContent = await PGPKeyModule.decryptContent("session", privateKey, content);

		return decryptedContent;
	} catch (exception) {
		return null;
	}
};

const walletEncrypt = async (content, identifier, password = "") => {
	let pgpRecord = await PGPKeyModule.findKey(identifier);

	const payload = {
		publicKey: pgpRecord?.publicKey,
		privateKey: null,
		new: false,
	};

	if (!pgpRecord) {
		await _generateNewWalletKeys(identifier, payload, password);
	} else {
		payload.privateKey = await PGPKeyModule.decryptKey(pgpRecord.type, pgpRecord.key);
	}

	const publicKey = await openpgp.readKey({
		armoredKey: payload.publicKey,
	});

	// Encrypt the message
	const encryptedMessage = await openpgp.encrypt({
		message: await openpgp.createMessage({ text: typeof content === "string" ? content : JSON.stringify(content) }),
		encryptionKeys: publicKey,
	});

	return { encryptedMessage, privateKey: payload.privateKey };
};

const _generateNewWalletKeys = async (identifier, walletData, password) => {
	const newPgpRecord = await PGPKeyModule.generateKey("storage", identifier, null, null, password);

	walletData.publicKey = newPgpRecord.publicKey;
	walletData.privateKey = newPgpRecord.privateKey;
	walletData.new = true;
};

const walletDecrypt = async (content, identifier, password) => {
	try {
		const _privateKey = await _getPrivateKey({ identifier });

		const privateKey = await openpgp.readPrivateKey({ armoredKey: _privateKey });

		const decryptedPrivateKey = await openpgp.decryptKey({
			privateKey,
			passphrase: config.pgp.globalPassphrase,
		});

		// Read the encrypted message
		const message = await openpgp.readMessage({
			armoredMessage: content,
		});

		// Decrypt the message
		const { data: decrypted } = await openpgp.decrypt({
			message,
			decryptionKeys: decryptedPrivateKey,
		});

		return decrypted;
	} catch (error) {
		console.error("Error during decryption:", { error });

		throw new Error("decryption_failed");
	}
};

/**
 * delete session
 * @param {Object} authUser
 * @author Miguel Trevino
 */
const deleteSession = async (authUser) => {
	return await Model.deleteMany({ identifier: authUser.identifier });
};

module.exports = {
	get,
	insert,
	getPublicKey,
	decryptContent,
	encryptContent,
	extractPublicKey,
	sessionDecrypt,
	walletEncrypt,
	walletDecrypt,
	deleteSession,
};
