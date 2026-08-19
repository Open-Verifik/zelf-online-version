/**
 * zSend certificate directory.
 *
 * Publish verifies the PEM against the Face PKI root before storing it, so a
 * sender that trusts the directory transitively trusts the root. Lookup returns
 * the PEM plus the purpose id the sender must reuse when wrapping a key.
 */
const FaceCertificatesModule = require("../../FaceCertificates/modules/face-certificates.module");
const Model = require("../models/zsend-certificate.model");
const PurposeModule = require("./zsend-purpose.module");
const { fail } = require("./zsend-errors.module");

const publicView = (record) => ({
	tagName: record.tagName,
	domain: record.domain,
	purposeId: record.purposeId,
	kind: record.kind,
	certificate: record.certificate,
	fingerprint: record.fingerprint,
	publicKey: record.publicKey,
	keyType: record.keyType,
	certificateExpiresAt: record.certificateExpiresAt,
	publishedAt: record.publishedAt,
	status: record.status,
});

const ownerView = (record) => ({
	...publicView(record),
	userSubjectName: record.userSubjectName,
	revokedAt: record.revokedAt,
});

/**
 * The session may not carry a tagName. When it does, it must match the claim.
 * @param {Object} authUser decoded JWT payload
 * @param {string} fullTagName
 */
const assertSessionMayClaim = (authUser, fullTagName) => {
	const sessionTagName = String(authUser?.tagName || "").trim().toLowerCase();

	if (sessionTagName && sessionTagName !== fullTagName) fail(403, "session_tagName_mismatch");
};

/**
 * Publish or rotate a Face Certificate for a Zelf name.
 *
 * @param {Object} params
 * @param {string} params.tagName
 * @param {string} [params.domain]
 * @param {string} [params.kind] `file` (default) or `message`
 * @param {string} params.certificate Face Certificate PEM
 * @param {string} [params.userSubjectName]
 * @param {string} [params.certificateExpiresAt]
 * @param {Object} authUser decoded JWT payload
 */
const publish = async (params, authUser) => {
	const identifier = authUser?.identifier;

	if (!identifier) fail(401, "missing_session_identifier");

	const domain = PurposeModule.normalizeDomain(params.domain);
	const kind = PurposeModule.normalizeKind(params.kind);
	const fullTagName = PurposeModule.normalizeTagName(params.tagName, domain);
	const purposeId = PurposeModule.purposeIdFor(fullTagName, { domain, kind });

	assertSessionMayClaim(authUser, fullTagName);

	if (!PurposeModule.isPemCertificate(params.certificate)) fail(409, "invalid_certificate");

	const fingerprint = PurposeModule.certificateFingerprint(params.certificate);

	// Reject anything the Face PKI root did not sign. Without this the directory
	// would happily serve a self-signed certificate to every sender.
	const verification = await FaceCertificatesModule.verify({ certificate: params.certificate });

	if (!verification?.publicKey) fail(422, "certificate_not_trusted_by_root");

	const existing = await Model.findOne({ tagName: fullTagName, domain, purposeId });

	if (existing && existing.ownerIdentifier !== identifier) fail(403, "certificate_owned_by_another_session");

	const attributes = {
		tagName: fullTagName,
		domain,
		purposeId,
		kind,
		certificate: params.certificate,
		fingerprint,
		publicKey: verification.publicKey,
		keyType: params.keyType || "Secp256k1",
		userSubjectName: params.userSubjectName || verification.metadata?.userSubjectName || null,
		certificateExpiresAt: params.certificateExpiresAt ? new Date(params.certificateExpiresAt) : null,
		ownerIdentifier: identifier,
		status: "active",
		revokedAt: null,
		publishedAt: new Date(),
	};

	const record = existing
		? await Model.findOneAndUpdate({ _id: existing._id }, { $set: attributes }, { new: true })
		: await Model.create(attributes);

	return ownerView(record);
};

/**
 * Resolve the active certificate a sender should wrap to.
 *
 * @param {Object} params
 * @param {string} params.tagName
 * @param {string} [params.domain]
 * @param {string} [params.kind]
 * @returns {Promise<Object>}
 */
const lookup = async (params) => {
	const domain = PurposeModule.normalizeDomain(params.domain);
	const kind = PurposeModule.normalizeKind(params.kind);
	const fullTagName = PurposeModule.normalizeTagName(params.tagName, domain);
	const purposeId = PurposeModule.purposeIdFor(fullTagName, { domain, kind });

	const record = await Model.findOne({ tagName: fullTagName, domain, purposeId, status: "active" });

	if (!record) fail(404, "certificate_not_published");

	return publicView(record);
};

/**
 * Certificates published by the current session.
 * @param {Object} params
 * @param {Object} authUser
 */
const listMine = async (params, authUser) => {
	const identifier = authUser?.identifier;

	if (!identifier) fail(401, "missing_session_identifier");

	const query = { ownerIdentifier: identifier };

	if (params?.kind) query.kind = PurposeModule.normalizeKind(params.kind);

	const records = await Model.find(query).sort({ publishedAt: -1 });

	return records.map(ownerView);
};

/**
 * Revoke a directory entry. Existing envelopes stay decryptable — the recipient
 * still holds the face and the purpose id — but no new sender can look it up.
 * @param {Object} params
 * @param {Object} authUser
 */
const revoke = async (params, authUser) => {
	const identifier = authUser?.identifier;

	if (!identifier) fail(401, "missing_session_identifier");

	const domain = PurposeModule.normalizeDomain(params.domain);
	const kind = PurposeModule.normalizeKind(params.kind);
	const fullTagName = PurposeModule.normalizeTagName(params.tagName, domain);
	const purposeId = PurposeModule.purposeIdFor(fullTagName, { domain, kind });

	const record = await Model.findOne({ tagName: fullTagName, domain, purposeId });

	if (!record) fail(404, "certificate_not_published");

	if (record.ownerIdentifier !== identifier) fail(403, "certificate_owned_by_another_session");

	const updated = await Model.findOneAndUpdate(
		{ _id: record._id },
		{ $set: { status: "revoked", revokedAt: new Date() } },
		{ new: true }
	);

	return ownerView(updated);
};

/**
 * Internal helper for the envelope module: the active record or a 404.
 * @param {Object} params
 */
const requireActiveRecord = async (params) => {
	const domain = PurposeModule.normalizeDomain(params.domain);
	const kind = PurposeModule.normalizeKind(params.kind);
	const fullTagName = PurposeModule.normalizeTagName(params.tagName, domain);
	const purposeId = PurposeModule.purposeIdFor(fullTagName, { domain, kind });

	const record = await Model.findOne({ tagName: fullTagName, domain, purposeId, status: "active" });

	if (!record) fail(404, "recipient_certificate_not_published");

	return record;
};

module.exports = {
	listMine,
	lookup,
	publish,
	requireActiveRecord,
	revoke,
};
