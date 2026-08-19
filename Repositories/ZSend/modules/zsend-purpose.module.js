/**
 * zSend purpose ids, name normalization, and envelope limits.
 *
 * A Face Certificate binds exactly one purpose id to one face-derived key pair.
 * zSend derives that purpose id from the recipient's Zelf name so a sender can
 * check, before wrapping anything, that the certificate it fetched was issued
 * for the exact name it typed.
 */
const crypto = require("crypto");

const { fail } = require("./zsend-errors.module");

/**
 * Envelope kinds share one directory and one envelope shape. Each kind gets its
 * own purpose id scope so a zSend certificate cannot open a Zelf Mail envelope.
 */
const ENVELOPE_KINDS = ["file", "message"];

const KIND_PURPOSE_SCOPE = {
	file: "zsend",
	message: "zmail",
};

const DEFAULT_KIND = "file";

const DEFAULT_DOMAIN = "zelf";

/** ZelfEncrypt v4 `encrypt` accepts 32–512 bytes after base64 decode. */
const CONTENT_KEY_MIN_BYTES = 32;
const CONTENT_KEY_MAX_BYTES = 512;

/**
 * Ceiling for the wrapped key an envelope stores. Generous next to real output
 * (hundreds of bytes for Secp256k1 ECIES, a few KB for MlKem), but bounded so a
 * caller cannot park arbitrary data in the directory.
 */
const MAX_WRAPPED_KEY_BYTES = 8 * 1024;

/** Only AEAD ciphers, so a tampered blob fails to open instead of decrypting to garbage. */
const CIPHER_ALGORITHMS = ["AES-GCM-256"];

const DEFAULT_CIPHER_ALGORITHM = "AES-GCM-256";

/** Free tier tops out at 3 days; paid tiers are capped at 30 to bound storage. */
const DEFAULT_EXPIRES_IN_HOURS = 72;
const MAX_EXPIRES_IN_HOURS = 720;

/** Convenience blob pinning is for small payloads only; larger ciphertext is client-uploaded. */
const MAX_INLINE_BLOB_BYTES = 5 * 1024 * 1024;

const normalizeDomain = (domain) => String(domain || DEFAULT_DOMAIN).trim().toLowerCase();

/**
 * Lowercase the name and append the domain suffix when the caller omitted it.
 * @param {string} tagName
 * @param {string} [domain]
 * @returns {string} e.g. `alice.zelf`
 */
const normalizeTagName = (tagName, domain) => {
	const normalizedDomain = normalizeDomain(domain);
	const trimmed = String(tagName || "").trim().toLowerCase();

	if (!trimmed) fail(409, "missing_tagName");

	return trimmed.endsWith(`.${normalizedDomain}`) ? trimmed : `${trimmed}.${normalizedDomain}`;
};

const normalizeKind = (kind) => {
	const normalized = String(kind || DEFAULT_KIND).trim().toLowerCase();

	if (!ENVELOPE_KINDS.includes(normalized)) fail(409, "unsupported_kind");

	return normalized;
};

/**
 * Canonical purpose id for a recipient. Clients should read this from
 * `GET /api/zsend/purpose-id` instead of hardcoding the format.
 * @param {string} tagName
 * @param {Object} [options]
 * @param {string} [options.domain]
 * @param {string} [options.kind] `file` or `message`
 * @returns {string} e.g. `zsend:alice.zelf`
 */
const purposeIdFor = (tagName, options = {}) => {
	const kind = normalizeKind(options.kind);
	const fullTagName = normalizeTagName(tagName, options.domain);

	return `${KIND_PURPOSE_SCOPE[kind]}:${fullTagName}`;
};

/**
 * Inverse of `purposeIdFor`. Returns null when the value is not a zSend purpose id.
 * @param {string} purposeId
 * @returns {{ kind: string, scope: string, tagName: string } | null}
 */
const parsePurposeId = (purposeId) => {
	const raw = String(purposeId || "").trim().toLowerCase();
	const separatorIndex = raw.indexOf(":");

	if (separatorIndex === -1) return null;

	const scope = raw.slice(0, separatorIndex);
	const tagName = raw.slice(separatorIndex + 1);

	if (!tagName) return null;

	const kind = ENVELOPE_KINDS.find((candidate) => KIND_PURPOSE_SCOPE[candidate] === scope);

	return kind ? { kind, scope, tagName } : null;
};

const stripPemArmor = (pem) =>
	String(pem || "")
		.replace(/-----(BEGIN|END)[^-]*-----/g, "")
		.replace(/\s/g, "");

/**
 * SHA-256 over the DER bytes of a PEM, so the same certificate fingerprints
 * identically regardless of line wrapping or trailing newlines.
 * @param {string} pem
 * @returns {string} lowercase hex
 */
const certificateFingerprint = (pem) => {
	const body = stripPemArmor(pem);

	if (!body) fail(409, "invalid_certificate");

	return crypto.createHash("sha256").update(Buffer.from(body, "base64")).digest("hex");
};

const isPemCertificate = (pem) => /-----BEGIN CERTIFICATE-----/.test(String(pem || ""));

const base64ByteLength = (value) => {
	const normalized = String(value || "").replace(/\s/g, "");

	if (!normalized) return 0;

	return Buffer.from(normalized, "base64").length;
};

/**
 * SHA-256 of a base64 payload, returned as base64 — the shape `/sign` and
 * `/verify-signature` expect for `dataSha256`.
 * @param {string} base64Value
 * @returns {string}
 */
const sha256OfBase64 = (base64Value) => {
	const normalized = String(base64Value || "").replace(/\s/g, "");

	return crypto.createHash("sha256").update(Buffer.from(normalized, "base64")).digest("base64");
};

/**
 * Clamp a requested TTL into the supported window.
 * @param {number|string} [expiresInHours]
 * @returns {Date}
 */
const resolveExpiresAt = (expiresInHours) => {
	const requested = Number(expiresInHours);
	const hours = Number.isFinite(requested) && requested > 0 ? Math.min(requested, MAX_EXPIRES_IN_HOURS) : DEFAULT_EXPIRES_IN_HOURS;

	return new Date(Date.now() + hours * 60 * 60 * 1000);
};

module.exports = {
	CIPHER_ALGORITHMS,
	CONTENT_KEY_MAX_BYTES,
	CONTENT_KEY_MIN_BYTES,
	MAX_WRAPPED_KEY_BYTES,
	DEFAULT_CIPHER_ALGORITHM,
	DEFAULT_DOMAIN,
	DEFAULT_EXPIRES_IN_HOURS,
	DEFAULT_KIND,
	ENVELOPE_KINDS,
	KIND_PURPOSE_SCOPE,
	MAX_EXPIRES_IN_HOURS,
	MAX_INLINE_BLOB_BYTES,
	base64ByteLength,
	certificateFingerprint,
	isPemCertificate,
	normalizeDomain,
	normalizeKind,
	normalizeTagName,
	parsePurposeId,
	purposeIdFor,
	resolveExpiresAt,
	sha256OfBase64,
};
