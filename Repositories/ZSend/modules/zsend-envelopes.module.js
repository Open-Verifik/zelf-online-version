/**
 * zSend envelopes.
 *
 * Create accepts only an already-wrapped content key. There is deliberately no
 * parameter for the raw key or the plaintext, so zSend cannot open what it
 * stores even if the database leaks.
 */
const crypto = require("crypto");

const BlobsModule = require("./zsend-blobs.module");
const CertificateModel = require("../models/zsend-certificate.model");
const CertificatesModule = require("./zsend-certificates.module");
const Model = require("../models/zsend-envelope.model");
const PurposeModule = require("./zsend-purpose.module");
const { fail } = require("./zsend-errors.module");

const isExpired = (record) => Boolean(record.expiresAt) && record.expiresAt.getTime() <= Date.now();

/**
 * Effective status, accounting for a TTL that lapsed since the last write.
 * @param {Object} record
 */
const effectiveStatus = (record) => {
	if (record.status === "pending" && isExpired(record)) return "expired";

	return record.status;
};

/** Listing shape: no wrapped key, so an inbox can render without exposing key material. */
const summaryView = (record) => ({
	envelopeId: record.envelopeId,
	kind: record.kind,
	fromTagName: record.fromTagName,
	toTagName: record.toTagName,
	toDomain: record.toDomain,
	purposeId: record.purposeId,
	filename: record.filename,
	mimeType: record.mimeType,
	byteLength: record.cipher?.byteLength || null,
	hasSenderProof: Boolean(record.senderProof?.signature),
	status: effectiveStatus(record),
	expiresAt: record.expiresAt,
	openedAt: record.openedAt,
	createdAt: record.createdAt,
});

/** Detail shape: everything the recipient needs to unwrap and open. */
const detailView = (record) => ({
	...summaryView(record),
	recipientFingerprint: record.recipientFingerprint,
	encryptedKey: record.encryptedKey,
	cipher: {
		algorithm: record.cipher?.algorithm,
		iv: record.cipher?.iv,
		authTag: record.cipher?.authTag || null,
		cid: record.cipher?.cid || null,
		url: record.cipher?.url || null,
		sha256: record.cipher?.sha256 || null,
		byteLength: record.cipher?.byteLength || null,
	},
	senderProof: record.senderProof
		? {
				signature: record.senderProof.signature,
				purposeId: record.senderProof.purposeId,
				certificate: record.senderProof.certificate || null,
				publicKey: record.senderProof.publicKey || null,
				keyType: record.senderProof.keyType || null,
			}
		: null,
});

/**
 * Directory entries this session controls.
 *
 * Recipient authorization comes from the directory, not from the `tagName` in
 * the JWT: `POST /api/sessions` accepts any `tagName` without proof, so that
 * claim would let anyone list another name's inbox. Publishing a certificate is
 * first-write-wins, so the publishing session identifier is the name's holder.
 *
 * Revoked entries still count — revoking should stop new senders, not lock the
 * recipient out of envelopes already addressed to them.
 *
 * @param {Object} authUser
 * @returns {Promise<Array<{ tagName: string, domain: string, purposeId: string }>>}
 */
const ownedDirectoryEntries = async (authUser) => {
	const identifier = authUser?.identifier;

	if (!identifier) return [];

	return CertificateModel.find({ ownerIdentifier: identifier }).select("tagName domain purposeId");
};

/**
 * Whether the session may see this envelope, and in which role.
 * @param {Object} record
 * @param {Object} authUser
 * @returns {Promise<"sender"|"recipient"|null>}
 */
const roleFor = async (record, authUser) => {
	const identifier = authUser?.identifier;

	if (!identifier) return null;

	if (record.fromIdentifier === identifier) return "sender";

	const owns = await CertificateModel.exists({
		tagName: record.toTagName,
		domain: record.toDomain,
		purposeId: record.purposeId,
		ownerIdentifier: identifier,
	});

	return owns ? "recipient" : null;
};

/**
 * Create an envelope.
 *
 * @param {Object} params
 * @param {string} params.toTagName recipient Zelf name
 * @param {string} [params.domain]
 * @param {string} [params.kind] `file` (default) or `message`
 * @param {string} params.encryptedKey output of Face Certificate encrypt
 * @param {Object} params.cipher AEAD parameters and ciphertext pointer
 * @param {string} [params.cipherBase64] small ciphertext for zSend to pin
 * @param {Object} [params.senderProof] optional signature over `cipher.sha256`
 * @param {number} [params.expiresInHours]
 * @param {Object} authUser decoded JWT payload
 */
const create = async (params, authUser) => {
	const identifier = authUser?.identifier;

	if (!identifier) fail(401, "missing_session_identifier");

	const domain = PurposeModule.normalizeDomain(params.domain);
	const kind = PurposeModule.normalizeKind(params.kind);
	const toTagName = PurposeModule.normalizeTagName(params.toTagName, domain);

	// Cheap input checks first, so malformed requests fail before any lookup or pin.
	if (String(params.encryptedKey || "").length > PurposeModule.MAX_WRAPPED_KEY_BYTES * 2) fail(413, "encryptedKey_too_large");

	const wrappedBytes = PurposeModule.base64ByteLength(params.encryptedKey);

	if (!wrappedBytes) fail(409, "missing_encryptedKey");

	if (wrappedBytes > PurposeModule.MAX_WRAPPED_KEY_BYTES) fail(413, "encryptedKey_too_large");

	const cipherInput = params.cipher || {};
	const algorithm = cipherInput.algorithm || PurposeModule.DEFAULT_CIPHER_ALGORITHM;

	if (!PurposeModule.CIPHER_ALGORITHMS.includes(algorithm)) fail(409, "unsupported_cipher_algorithm");

	if (!cipherInput.iv) fail(409, "missing_cipher_iv");

	if (params.senderProof && !params.senderProof.signature) fail(409, "missing_senderProof_signature");

	const recipient = await CertificatesModule.requireActiveRecord({ tagName: toTagName, domain, kind });

	let pointer = {
		cid: cipherInput.cid || null,
		url: cipherInput.url || null,
		sha256: cipherInput.sha256 || null,
		byteLength: cipherInput.byteLength || null,
	};

	let blobOwnedByZSend = false;

	if (params.cipherBase64) {
		const pinned = await BlobsModule.pinCiphertext({ cipherBase64: params.cipherBase64, filename: params.filename }, authUser);

		pointer = { cid: pinned.cid, url: pinned.url, sha256: pinned.sha256, byteLength: pinned.byteLength };
		blobOwnedByZSend = true;
	}

	if (!pointer.cid && !pointer.url) fail(409, "missing_cipher_pointer");

	if (params.senderProof && !pointer.sha256) fail(409, "senderProof_requires_cipher_sha256");

	const record = await Model.create({
		envelopeId: crypto.randomUUID(),
		kind,
		fromTagName: authUser?.tagName ? String(authUser.tagName).trim().toLowerCase() : null,
		fromIdentifier: identifier,
		toTagName,
		toDomain: domain,
		purposeId: recipient.purposeId,
		recipientFingerprint: recipient.fingerprint,
		encryptedKey: params.encryptedKey,
		cipher: {
			algorithm,
			iv: cipherInput.iv,
			authTag: cipherInput.authTag || null,
			...pointer,
		},
		senderProof: params.senderProof
			? {
					signature: params.senderProof.signature,
					purposeId: params.senderProof.purposeId || null,
					certificate: params.senderProof.certificate || null,
					publicKey: params.senderProof.publicKey || null,
					keyType: params.senderProof.keyType || "Secp256k1",
				}
			: null,
		filename: params.filename || null,
		mimeType: params.mimeType || null,
		expiresAt: PurposeModule.resolveExpiresAt(params.expiresInHours),
		status: "pending",
		blobOwnedByZSend,
	});

	return detailView(record);
};

/**
 * List envelopes for the session.
 *
 * @param {Object} params
 * @param {string} [params.box] `inbox` or `outbox` (default)
 * @param {string} [params.kind]
 * @param {Object} authUser
 */
const list = async (params, authUser) => {
	const identifier = authUser?.identifier;

	if (!identifier) fail(401, "missing_session_identifier");

	const box = String(params?.box || "outbox").trim().toLowerCase();
	const query = {};

	if (box === "inbox") {
		const owned = await ownedDirectoryEntries(authUser);

		// Publishing a certificate is what claims a name, so it is also what creates an inbox.
		if (!owned.length) fail(409, "no_published_certificate_for_inbox");

		query.$or = owned.map((entry) => ({ toTagName: entry.tagName, toDomain: entry.domain, purposeId: entry.purposeId }));
	} else if (box === "outbox") {
		query.fromIdentifier = identifier;
	} else {
		fail(409, "unsupported_box");
	}

	if (params?.kind) query.kind = PurposeModule.normalizeKind(params.kind);

	const records = await Model.find(query).sort({ createdAt: -1 }).limit(200);

	return records.map(summaryView);
};

/**
 * Fetch one envelope with the wrapped key.
 * @param {Object} params
 * @param {string} params.envelopeId
 * @param {Object} authUser
 */
const get = async (params, authUser) => {
	const record = await Model.findOne({ envelopeId: params.envelopeId });

	if (!record) fail(404, "envelope_not_found");

	if (!(await roleFor(record, authUser))) fail(403, "envelope_not_accessible");

	if (record.status === "revoked") fail(404, "envelope_revoked");

	if (effectiveStatus(record) === "expired") fail(404, "envelope_expired");

	return detailView(record);
};

/**
 * Mark an envelope opened. Recipient only, and idempotent.
 * @param {Object} params
 * @param {Object} authUser
 */
const markOpened = async (params, authUser) => {
	const record = await Model.findOne({ envelopeId: params.envelopeId });

	if (!record) fail(404, "envelope_not_found");

	if ((await roleFor(record, authUser)) !== "recipient") fail(403, "only_recipient_can_open");

	if (record.status === "revoked") fail(404, "envelope_revoked");

	if (effectiveStatus(record) === "expired") fail(404, "envelope_expired");

	if (record.status === "opened") return summaryView(record);

	const updated = await Model.findOneAndUpdate(
		{ _id: record._id },
		{ $set: { status: "opened", openedAt: new Date() } },
		{ new: true }
	);

	return summaryView(updated);
};

/**
 * Revoke an envelope. Sender only. Unpins the blob when zSend pinned it.
 * @param {Object} params
 * @param {Object} authUser
 */
const revoke = async (params, authUser) => {
	const record = await Model.findOne({ envelopeId: params.envelopeId });

	if (!record) fail(404, "envelope_not_found");

	if ((await roleFor(record, authUser)) !== "sender") fail(403, "only_sender_can_revoke");

	if (record.blobOwnedByZSend && record.cipher?.cid) await BlobsModule.unpinCiphertext(record.cipher.cid);

	const updated = await Model.findOneAndUpdate(
		{ _id: record._id },
		{ $set: { status: "revoked", revokedAt: new Date(), encryptedKey: null, "cipher.cid": null, "cipher.url": null } },
		{ new: true }
	);

	return summaryView(updated);
};

/**
 * Sweep lapsed envelopes: flip status and drop the wrapped key so an expired
 * transfer stops being openable even if the ciphertext survives elsewhere.
 * Intended for a cron entry point.
 * @returns {Promise<{ expired: number }>}
 */
const pruneExpired = async () => {
	const lapsed = await Model.find({ status: "pending", expiresAt: { $lte: new Date() } });

	for (const record of lapsed) {
		if (record.blobOwnedByZSend && record.cipher?.cid) await BlobsModule.unpinCiphertext(record.cipher.cid);

		await Model.updateOne(
			{ _id: record._id },
			{ $set: { status: "expired", encryptedKey: null, "cipher.cid": null, "cipher.url": null } }
		);
	}

	return { expired: lapsed.length };
};

module.exports = {
	create,
	get,
	list,
	markOpened,
	pruneExpired,
	revoke,
};
