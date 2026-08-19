const mongoose = require("mongoose");

const Schema = mongoose.Schema;
const { String, Number, Date: SchemaDate, Boolean } = mongoose.Schema.Types;

const { defaultField, requiredField, requiredEnumField, addBasicPlugins } = require("../../../Core/mongoose-utils");

// ─────────────────────────────────────────────────────────────────────────────
// ZSendEnvelope — one zSend transfer.
//
// The server never holds anything that can open the payload. It stores the
// wrapped content key (already encrypted to the recipient's Face Certificate),
// a pointer to the ciphertext, and the AEAD parameters needed to open it once
// the recipient recovers the key with their face.
//
// `kind` is what lets Zelf Mail reuse this record later: a message is the same
// envelope with a `zmail:` purpose id and a small JSON payload.
// ─────────────────────────────────────────────────────────────────────────────

/** AEAD parameters. The key that opens this is never stored server-side. */
const CipherSchema = new Schema(
	{
		algorithm: requiredEnumField(String, ["AES-GCM-256"], "AES-GCM-256"),

		/** Base64 IV/nonce generated per envelope by the sender */
		iv: requiredField(String),

		/** Base64 GCM tag, when the client does not append it to the ciphertext */
		authTag: defaultField(String, null),

		/** IPFS CID of the ciphertext blob */
		cid: defaultField(String, null),

		/** Gateway or caller-supplied URL for the ciphertext blob */
		url: defaultField(String, null),

		/** SHA-256 of the ciphertext, base64 — also the digest the sender signs */
		sha256: defaultField(String, null),

		byteLength: defaultField(Number, null),
	},
	{ _id: false }
);

/** Optional sender authenticity, produced by POST /api/my-face-certificates/sign. */
const SenderProofSchema = new Schema(
	{
		signature: requiredField(String),

		/** Purpose id whose face key produced the signature */
		purposeId: requiredField(String),

		/** Sender certificate PEM so the recipient can verify without a directory hit */
		certificate: defaultField(String, null),

		publicKey: defaultField(String, null),

		keyType: defaultField(String, "Secp256k1"),
	},
	{ _id: false }
);

const ZSendEnvelopeSchema = new Schema({
	envelopeId: { type: String, required: true, unique: true, index: true },

	kind: requiredEnumField(String, ["file", "message"], "file"),

	/** Sender is identified by session; tagName is present only when the session carries one */
	fromTagName: defaultField(String, null),
	fromIdentifier: requiredField(String),

	toTagName: requiredField(String),
	toDomain: requiredField(String),

	/** Purpose id the content key was wrapped to; the recipient must reuse it to unwrap */
	purposeId: requiredField(String),

	/** Which directory entry was used, so a rotated certificate is detectable */
	recipientFingerprint: requiredField(String),

	/**
	 * Content key encrypted to the recipient certificate. Never the raw key.
	 * Cleared on revoke and expiry, so it is not schema-required.
	 */
	encryptedKey: defaultField(String, null),

	cipher: { type: CipherSchema, required: true },

	senderProof: { type: SenderProofSchema, default: null },

	/** Server-visible display metadata. Payload contents are not. */
	filename: defaultField(String, null),
	mimeType: defaultField(String, null),

	expiresAt: { type: SchemaDate, required: true, index: true },

	status: requiredEnumField(String, ["pending", "opened", "expired", "revoked"], "pending"),

	openedAt: defaultField(SchemaDate, null),
	revokedAt: defaultField(SchemaDate, null),

	/** True when zSend pinned the blob itself and should unpin it on delete */
	blobOwnedByZSend: defaultField(Boolean, false),
});

ZSendEnvelopeSchema.index({ toTagName: 1, toDomain: 1, status: 1 });
ZSendEnvelopeSchema.index({ fromIdentifier: 1, createdAt: -1 });

addBasicPlugins(ZSendEnvelopeSchema);

module.exports = mongoose.model("ZSendEnvelope", ZSendEnvelopeSchema);
