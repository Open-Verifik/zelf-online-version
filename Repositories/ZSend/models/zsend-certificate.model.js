const mongoose = require("mongoose");

const Schema = mongoose.Schema;
const { String, Date: SchemaDate } = mongoose.Schema.Types;

const { defaultField, requiredField, requiredEnumField, addBasicPlugins } = require("../../../Core/mongoose-utils");

// ─────────────────────────────────────────────────────────────────────────────
// ZSendCertificate — the zSend certificate directory.
//
// A Face Certificate PEM is 1–3 KB. Tag `publicData` is Pinata pin metadata,
// capped at 9 keyvalues of 250 chars each (see Repositories/Tags/modules/
// tags-addresses.module.js), so the PEM cannot be published there. The
// directory keeps the PEM in Mongo and is keyed by (tagName, domain,
// purposeId) — one entry per Zelf name per envelope kind.
//
// Nothing here is secret: a certificate holds only a public key. Its value is
// integrity, which comes from the Face PKI root signature verified on publish.
// ─────────────────────────────────────────────────────────────────────────────

const ZSendCertificateSchema = new Schema({
	tagName: requiredField(String),
	domain: requiredField(String),

	/** `zsend:alice.zelf` or `zmail:alice.zelf` — see modules/zsend-purpose.module.js */
	purposeId: requiredField(String),

	/** `file` or `message`, derived from the purpose id scope */
	kind: requiredEnumField(String, ["file", "message"], "file"),

	/** Face Certificate PEM as issued by ZelfEncrypt v4 */
	certificate: requiredField(String),

	/** SHA-256 of the certificate DER, so an envelope can name the cert it wrapped to */
	fingerprint: requiredField(String),

	/** Base64 public key returned by the Face PKI verify call at publish time */
	publicKey: defaultField(String, null),

	keyType: defaultField(String, "Secp256k1"),

	userSubjectName: defaultField(String, null),

	/** Certificate expiry as reported by the caller; independent of envelope TTL */
	certificateExpiresAt: defaultField(SchemaDate, null),

	/**
	 * Session identifier that first published this entry. Re-publishing (key
	 * rotation) requires the same identifier, making the directory first-write-wins.
	 */
	ownerIdentifier: requiredField(String),

	status: requiredEnumField(String, ["active", "revoked"], "active"),

	revokedAt: defaultField(SchemaDate, null),

	publishedAt: defaultField(SchemaDate, Date.now),
});

ZSendCertificateSchema.index({ tagName: 1, domain: 1, purposeId: 1 }, { unique: true });
ZSendCertificateSchema.index({ ownerIdentifier: 1 });
ZSendCertificateSchema.index({ fingerprint: 1 });

addBasicPlugins(ZSendCertificateSchema);

module.exports = mongoose.model("ZSendCertificate", ZSendCertificateSchema);
