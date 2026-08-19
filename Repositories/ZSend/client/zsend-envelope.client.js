/**
 * zSend envelope reference client.
 *
 * One source of truth for the client-side half of zSend, so the extension and
 * the dashboard cannot drift on framing, nonce size, or digest encoding. Uses
 * only WebCrypto, so it runs unchanged in a browser, an extension service
 * worker, and Node.
 *
 * What this module deliberately does not do:
 *
 *   - It never touches a Face PKI or issuer private key. Certificates are
 *     public; only `https://v4.zelf.world` holds `pki_private_key`. Never embed
 *     `ISSUERS_PUBLIC_KEY` in the extension, the ZNS app, or a Zelf ID APK.
 *   - It never sends the content key anywhere except the Face Certificate
 *     `encrypt` call that wraps it. `POST /api/my-zsend/envelopes` has no
 *     parameter for a raw key or plaintext.
 *   - It never trusts a fetched certificate on its own. Callers verify against
 *     the pinned root before wrapping anything to it.
 *
 * The face is the only thing that opens an envelope. A leaked database yields
 * wrapped keys and ciphertext, neither of which is useful without it.
 */

/** AES-256-GCM. 12-byte nonce is the GCM standard; 128-bit tag is the WebCrypto default. */
const CIPHER_ALGORITHM = "AES-GCM-256";
const CONTENT_KEY_BYTES = 32;
const IV_BYTES = 12;
const AUTH_TAG_BITS = 128;

const webcrypto = () => {
	const crypto = globalThis.crypto;

	if (!crypto?.subtle) throw new Error("zsend_webcrypto_unavailable");

	return crypto;
};

const toBase64 = (bytes) => {
	const view = new Uint8Array(bytes);

	if (typeof Buffer !== "undefined") return Buffer.from(view).toString("base64");

	let binary = "";
	view.forEach((byte) => {
		binary += String.fromCharCode(byte);
	});

	return btoa(binary);
};

const fromBase64 = (value) => {
	const normalized = String(value || "").replace(/\s/g, "");

	if (typeof Buffer !== "undefined") return new Uint8Array(Buffer.from(normalized, "base64"));

	const binary = atob(normalized);
	const bytes = new Uint8Array(binary.length);

	for (let index = 0; index < binary.length; index += 1) bytes[index] = binary.charCodeAt(index);

	return bytes;
};

/**
 * Fresh content key. One per envelope — reusing a key across envelopes would let
 * one recovered key open every past transfer.
 * @returns {Uint8Array} 32 bytes
 */
const generateContentKey = () => webcrypto().getRandomValues(new Uint8Array(CONTENT_KEY_BYTES));

/**
 * SHA-256 as base64, the shape `/sign` and `/verify-signature` expect for `dataSha256`.
 * @param {Uint8Array|ArrayBuffer} bytes
 * @returns {Promise<string>}
 */
const sha256Base64 = async (bytes) => {
	const digest = await webcrypto().subtle.digest("SHA-256", new Uint8Array(bytes));

	return toBase64(digest);
};

/**
 * Encrypt a payload locally. The plaintext never leaves the device.
 *
 * WebCrypto appends the 128-bit GCM tag to the ciphertext, so `authTag` stays
 * null. It exists in the envelope for clients whose AEAD returns the tag
 * separately.
 *
 * @param {Uint8Array} payloadBytes
 * @param {Uint8Array} contentKey 32 bytes from `generateContentKey`
 * @returns {Promise<{ cipherBase64: string, cipher: Object }>}
 */
const encryptPayload = async (payloadBytes, contentKey) => {
	const crypto = webcrypto();
	const iv = crypto.getRandomValues(new Uint8Array(IV_BYTES));

	const key = await crypto.subtle.importKey("raw", contentKey, "AES-GCM", false, ["encrypt"]);

	const ciphertext = await crypto.subtle.encrypt({ name: "AES-GCM", iv, tagLength: AUTH_TAG_BITS }, key, new Uint8Array(payloadBytes));

	const cipherBase64 = toBase64(ciphertext);

	return {
		cipherBase64,
		cipher: {
			algorithm: CIPHER_ALGORITHM,
			iv: toBase64(iv),
			authTag: null,
			sha256: await sha256Base64(ciphertext),
			byteLength: new Uint8Array(ciphertext).byteLength,
		},
	};
};

/**
 * Decrypt a payload once the content key has been recovered with the face via
 * `POST /api/my-face-certificates/decrypt`.
 *
 * Throws when the ciphertext or the nonce was altered — GCM authenticates both,
 * so a tampered blob fails instead of decrypting to garbage.
 *
 * @param {Object} params
 * @param {string} params.cipherBase64
 * @param {Object} params.cipher envelope `cipher` block
 * @param {Uint8Array} params.contentKey
 * @returns {Promise<Uint8Array>}
 */
const decryptPayload = async ({ cipherBase64, cipher, contentKey }) => {
	const crypto = webcrypto();

	if (cipher?.algorithm && cipher.algorithm !== CIPHER_ALGORITHM) throw new Error("zsend_unsupported_cipher_algorithm");

	const key = await crypto.subtle.importKey("raw", contentKey, "AES-GCM", false, ["decrypt"]);

	// A separated tag is appended back on, since WebCrypto expects it inline.
	const body = fromBase64(cipherBase64);
	const tag = cipher?.authTag ? fromBase64(cipher.authTag) : null;
	const payload = tag ? new Uint8Array([...body, ...tag]) : body;

	const plaintext = await crypto.subtle.decrypt(
		{ name: "AES-GCM", iv: fromBase64(cipher.iv), tagLength: AUTH_TAG_BITS },
		key,
		payload
	);

	return new Uint8Array(plaintext);
};

/**
 * Confirm a fetched certificate is the one the recipient published for this
 * name, and that the server verified it against the Face PKI root.
 *
 * `POST /api/my-zsend/certificates` refuses anything the root did not sign, so a
 * directory hit is already root-checked. A client that wants to check
 * independently should call `POST /api/my-face-certificates/verify` and compare
 * the root against the copy it pinned from
 * `GET /api/face-certificates/root-certificate`.
 *
 * @param {Object} directoryEntry response from `GET /api/zsend/certificates`
 * @param {string} expectedPurposeId from `GET /api/zsend/purpose-id`
 */
const assertCertificateMatchesPurpose = (directoryEntry, expectedPurposeId) => {
	if (!directoryEntry?.certificate) throw new Error("zsend_certificate_missing");

	if (directoryEntry.purposeId !== expectedPurposeId) throw new Error("zsend_purpose_id_mismatch");

	if (directoryEntry.status !== "active") throw new Error("zsend_certificate_not_active");
};

/**
 * Assemble the `POST /api/my-zsend/envelopes` body.
 *
 * @param {Object} params
 * @param {string} params.toTagName
 * @param {string} params.encryptedKey from Face Certificate `encrypt`
 * @param {Object} params.cipher from `encryptPayload`
 * @param {string} [params.cipherBase64] only for payloads small enough for zSend to pin
 * @param {Object} [params.senderProof] from Face Certificate `sign` over `cipher.sha256`
 * @param {string} [params.kind] `file` or `message`
 * @param {string} [params.filename] server-visible
 * @param {string} [params.mimeType] server-visible
 * @param {number} [params.expiresInHours]
 * @returns {Object}
 */
const buildEnvelopeRequest = (params) => {
	const body = {
		toTagName: params.toTagName,
		encryptedKey: params.encryptedKey,
		cipher: params.cipher,
	};

	if (params.domain) body.domain = params.domain;
	if (params.kind) body.kind = params.kind;
	if (params.cipherBase64) body.cipherBase64 = params.cipherBase64;
	if (params.senderProof) body.senderProof = params.senderProof;
	if (params.filename) body.filename = params.filename;
	if (params.mimeType) body.mimeType = params.mimeType;
	if (params.expiresInHours) body.expiresInHours = params.expiresInHours;

	return body;
};

module.exports = {
	AUTH_TAG_BITS,
	CIPHER_ALGORITHM,
	CONTENT_KEY_BYTES,
	IV_BYTES,
	assertCertificateMatchesPurpose,
	buildEnvelopeRequest,
	decryptPayload,
	encryptPayload,
	fromBase64,
	generateContentKey,
	sha256Base64,
	toBase64,
};
