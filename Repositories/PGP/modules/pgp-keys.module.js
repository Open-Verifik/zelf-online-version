const openpgp = require("openpgp");
const config = require("../../../Core/config");
const passphrase = config.pgp.passphrase;
const globalPassphrase = config.pgp.globalPassphrase;
const Model = require("../models/pgp-keys.model");

const buildScopedIdentifier = (type = "session", identifier, scopeKey) => {
	if (type === "storage" && scopeKey) return `storage:${scopeKey}`;
	if (type === "session" && identifier) return `session:${identifier}`;

	return `${identifier}`;
};

const touchRecord = async (record) => {
	if (!record?._id) return;

	await Model.updateOne({ _id: record._id }, { $set: { lastTimeUsed: new Date() } }).catch(() => null);
};

const generateKey = async (type = "session", identifier, name, email, password, options = {}) => {
	name = name || "Miguel T";
	email = email || "miguel@zelf.world";

	const { privateKey, publicKey } = await openpgp.generateKey({
		type: "ecc",
		curve: "curve25519",
		userIDs: [{ name, email }],
		passphrase: password || (type === "session" ? passphrase : globalPassphrase),
	});

	await _saveKey(type, identifier, privateKey, publicKey, { name, email }, options);

	return { publicKey, privateKey };
};

const _saveKey = async (type = "session", identifier, privateKey, publicKey, userIDs, options = {}) => {
	const encryptedPrivateKey = await encryptKey(type, privateKey);
	const scopeType = options.scopeType || undefined;
	const scopeKey = options.scopeKey || undefined;
	const storedIdentifier = buildScopedIdentifier(type, identifier, scopeKey);

	try {
		const keyToStore = {
			type,
			key: encryptedPrivateKey,
			publicKey: publicKey,
			identifier: storedIdentifier,
			scopeType,
			scopeKey,
			name: userIDs.name,
			email: userIDs.email,
		};
		const query = scopeKey ? { type, scopeKey } : { type, identifier: storedIdentifier };

		await Model.findOneAndUpdate(query, { $set: keyToStore }, { upsert: true, setDefaultsOnInsert: true });
	} catch (exception) {
		console.error({
			keyToStoreExcp: exception,
			type,
			identifier: storedIdentifier,
			scopeKey,
			name: userIDs.name,
			email: userIDs.email,
		});
	}

	return publicKey;
};

const findSessionKey = async (identifier, authUser) => {
	let query = null;

	if (authUser) {
		const identifiers = [authUser.identifier, authUser.ip].filter(Boolean);
		if (!identifiers.length) return null;

		query = {
			type: "session",
			$or: [
				{ identifier: { $in: identifiers } },
				{ identifier: { $in: identifiers.map((_identifier) => buildScopedIdentifier("session", _identifier)) } },
			],
		};
	} else {
		if (!identifier) return null;

		query = {
			type: "session",
			$or: [{ identifier }, { identifier: buildScopedIdentifier("session", identifier) }],
		};
	}

	const pgpRecord = await Model.findOne(query).sort({ lastTimeUsed: -1 });

	await touchRecord(pgpRecord);

	return pgpRecord;
};

const findStorageKey = async ({ scopeKey, legacyIdentifier } = {}) => {
	const conditions = [];

	if (scopeKey) {
		conditions.push({ type: "storage", scopeKey });
		conditions.push({ type: "storage", identifier: buildScopedIdentifier("storage", scopeKey, scopeKey) });
		conditions.push({ type: "storage", identifier: `${scopeKey}` });
	}

	if (legacyIdentifier) {
		conditions.push({ type: "storage", identifier: `${legacyIdentifier}` });
	}

	if (!conditions.length) return null;

	const pgpRecord = await Model.findOne(conditions.length === 1 ? conditions[0] : { $or: conditions }).sort({ lastTimeUsed: -1 });

	await touchRecord(pgpRecord);

	return pgpRecord;
};

const findKey = async (identifier, authUser) => {
	return await findSessionKey(identifier, authUser);
};

const encryptKey = async (type = "session", key) => {
	const encryptedKey = await openpgp.encrypt({
		message: await openpgp.createMessage({ text: key }), // input as Message object
		passwords: [type === "session" ? passphrase : globalPassphrase],
		format: "armored", // output as string (armored)
	});

	return encryptedKey;
};

const decryptKey = async (type = "session", encryptedKey) => {
	if (!encryptedKey) return null;

	const message = await openpgp.readMessage({
		armoredMessage: encryptedKey, // parse armored message
	});

	let decrypted = null;

	try {
		decrypted = await openpgp.decrypt({
			message,
			passwords: [type === "session" ? passphrase : globalPassphrase],
			format: "utf8", // output as string
		});
	} catch (exception) {
		console.error({ exception });
	}

	return decrypted?.data;
};

/**
 * Encrypt arbitrary content to a client-provided public key (no passphrase / no stored keys).
 * @param {Object|string} content
 * @param {string} armoredPublicKey
 * @returns {Promise<{ encryptedMessage: string }>}
 */
const encryptToPublicKey = async (content, armoredPublicKey) => {
	if (!armoredPublicKey) throw new Error("missing_client_public_key");

	const publicKey = await openpgp.readKey({ armoredKey: armoredPublicKey });
	const encryptedMessage = await openpgp.encrypt({
		message: await openpgp.createMessage({
			text: typeof content === "string" ? content : JSON.stringify(content),
		}),
		encryptionKeys: publicKey,
	});

	return { encryptedMessage };
};

/**
 * decrypt content with global passphrase
 * @param {String} privateKey
 * @param {String} content
 * @author Miguel Trevino
 */
const decryptContent = async (type = "session", privateKey, content) => {
	const _privateKey = await openpgp.readPrivateKey({ armoredKey: privateKey });

	const decryptedPrivateKey = await openpgp.decryptKey({
		privateKey: _privateKey,
		passphrase: ["session"].includes(type) ? passphrase : globalPassphrase,
	});

	const message = await openpgp.readMessage({
		armoredMessage: content,
	});

	// Decrypt the message
	const { data: decrypted } = await openpgp.decrypt({
		message,
		decryptionKeys: decryptedPrivateKey,
	});

	return decrypted;
};

module.exports = {
	generateKey,
	findKey,
	findSessionKey,
	findStorageKey,
	encryptKey,
	decryptKey,
	encryptToPublicKey,
	decryptContent,
};
