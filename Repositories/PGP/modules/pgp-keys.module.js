const openpgp = require("openpgp");
const config = require("../../../Core/config");
const passphrase = config.pgp.passphrase;
const globalPassphrase = config.pgp.globalPassphrase;
const Model = require("../models/pgp-keys.model");
const MongoORM = require("../../../Core/mongo-orm");

const generateKey = async (type = "session", identifier, name, email, password) => {
	name = name || "Miguel T";

	email = email || "miguel@zelf.world";

	const { privateKey, publicKey } = await openpgp.generateKey({
		type: "ecc",
		curve: "curve25519",
		userIDs: [{ name, email }],
		passphrase: password || (type === "session" ? passphrase : globalPassphrase),
	});

	await _saveKey(type, identifier, privateKey, publicKey, { name, email });

	return { publicKey, privateKey };
};

const _saveKey = async (type = "session", identifier, privateKey, publicKey, userIDs) => {
	const encryptedPrivateKey = await encryptKey(type, privateKey);

	try {
		const keyToStore = new Model({
			type,
			key: encryptedPrivateKey,
			publicKey: publicKey,
			identifier: `${identifier}`,
			name: userIDs.name,
			email: userIDs.email,
		});

		await keyToStore.save();
	} catch (exception) {
		console.error({
			keyToStoreExcp: exception,
			type,
			identifier: `${identifier}`,
			name: userIDs.name,
			email: userIDs.email,
		});
	}

	return publicKey;
};

const findKey = async (identifier) => {
	const pgpRecord = await MongoORM.buildQuery(
		{
			where_identifier: identifier,
			findOne: true,
		},
		Model,
		null,
		[]
	);

	return pgpRecord;
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
 * decrypt content with global passphrase
 * @param {String} privateKey
 * @param {String} content
 * @author Miguel Trevino
 */
const decryptContent = async (type = "session", privateKey, content) => {
	const _privateKey = await openpgp.readPrivateKey({ armoredKey: privateKey });

	const decryptedPrivateKey = await openpgp.decryptKey({
		privateKey: _privateKey,
		passphrase: type === "session" ? passphrase : globalPassphrase,
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
	encryptKey,
	decryptKey,
	decryptContent,
};
