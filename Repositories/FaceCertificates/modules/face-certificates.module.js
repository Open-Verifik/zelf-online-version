/**
 * Face Certificate client — ZelfEncrypt v4 Face PKI on `config.zelfProofV4.url`.
 * Koa inbound/outbound uses Zelf field names. Upstream wire names stay in this file.
 */
const axiosCore = require("../../../Core/axios");
const config = require("../../../Core/config");

let _client = null;

const KEY_TYPES = ["MlKem512", "MlKem768", "MlKem1024", "MlDsa44", "MlDsa65", "MlDsa87", "Secp256k1"];
const SIGNING_KEY_TYPES = ["MlDsa44", "MlDsa65", "MlDsa87", "Secp256k1"];

const getClient = () => {
	if (!_client) _client = axiosCore.getEncryptionInstanceV4();
	return _client;
};

const normalizeFaceBase64 = (faceBase64) => {
	if (faceBase64 == null || typeof faceBase64 !== "string") return faceBase64;
	const trimmed = faceBase64.trim();
	const marker = "base64,";
	const idx = trimmed.indexOf(marker);
	if (idx !== -1 && trimmed.slice(0, 5).toLowerCase() === "data:") {
		return trimmed.slice(idx + marker.length).replace(/\s/g, "");
	}
	return trimmed.replace(/\s/g, "");
};

const publicErrorText = (value) => {
	if (value == null) return value;
	return String(value)
		.replace(/SensePrint/gi, "ZelfProof")
		.replace(/SenseCrypt/gi, "ZelfEncrypt")
		.replace(/SeventhSense/gi, "Zelf")
		.replace(/senseprint/gi, "zelfProof");
};

const wrapUpstreamError = (exception) => {
	const payload = exception.response?.data || {};
	const message = publicErrorText(payload.message || exception.message || "Something went wrong");
	const error = new Error(typeof message === "string" ? message.toUpperCase() : "SOMETHING WENT WRONG");
	error.code = publicErrorText(payload.code);
	error.status = exception.response?.status || 500;
	return error;
};

const proofBytes = (data) => data.zelfProof;
const faceBytes = (data) => normalizeFaceBase64(data.faceBase64);

const proofUnlockFields = (data) => ({
	os: data.os || "DESKTOP",
	password: data.password || undefined,
	liveness_tolerance: data.livenessTolerance || data.livenessLevel || undefined,
	verifiers_auth_key: data.verifierKey || (data.addServerPassword ? config.zelfEncrypt.serverKey : undefined),
});

const postJson = async (path, body) => {
	try {
		const response = await getClient().post(path, body);
		return response.data;
	} catch (exception) {
		throw wrapUpstreamError(exception);
	}
};

const mapGenerateResponse = (data) => ({
	certificate: data.cert_pem,
});

const mapVerifyResponse = (data) => ({
	publicKey: data.public_key_base64,
	metadata: data.metadata,
});

const mapEncryptResponse = (data) => ({
	encryptedKey: data.encrypted_key_base_64,
});

const mapDecryptResponse = (data) => ({
	keyBase64: data.key_base_64,
});

const mapSignResponse = (data) => ({
	signature: data.signature_base_64,
});

const mapPublicKeyResponse = (data) => ({
	publicKey: data.public_key_pem,
});

const mapValidResponse = (data) => ({
	valid: data.is_valid,
});

/**
 * GET /root-certificate — PEM Face PKI root.
 * @returns {Promise<{ rootCertificate: string }>}
 */
const rootCertificate = async () => {
	try {
		const response = await getClient().get("/root-certificate", { responseType: "text" });
		const pem = typeof response.data === "string" ? response.data : String(response.data || "");
		return { rootCertificate: pem };
	} catch (exception) {
		throw wrapUpstreamError(exception);
	}
};

/**
 * Issue a Face Certificate for a purpose id.
 * @param {Object} data
 */
const generate = async (data) => {
	const upstream = await postJson("/generate-face-certificate", {
		face_base_64: faceBytes(data),
		senseprint_base_64: proofBytes(data),
		purpose_id: data.purposeId,
		user_subject_name: data.userSubjectName,
		expiration_date_utc: data.expirationDateUtc,
		key_type: data.keyType || "Secp256k1",
		requested_attributes: data.requestedAttributes,
		attribute_encryption_public_key_base64: data.attributePublicKey,
		check_live_face_before_creation: data.checkLiveFaceBeforeCreation === true,
		...proofUnlockFields(data),
	});
	return mapGenerateResponse(upstream);
};

/**
 * Verify a Face Certificate against the server root.
 * @param {Object} data
 */
const verify = async (data) => {
	const upstream = await postJson("/verify-face-certificate", {
		cert_pem: data.certificate,
		attribute_encryption_private_key_base64: data.attributePrivateKey,
	});
	return mapVerifyResponse(upstream);
};

/**
 * Encrypt a key with a Face Certificate public key.
 * @param {Object} data
 */
const encrypt = async (data) => {
	const upstream = await postJson("/encrypt-with-face-certificate", {
		face_certificate_pem: data.certificate,
		key_base_64: data.keyBase64,
	});
	return mapEncryptResponse(upstream);
};

/**
 * Decrypt a key using face + proof + purpose id.
 * @param {Object} data
 */
const decrypt = async (data) => {
	const upstream = await postJson("/face-decrypt", {
		face_base_64: faceBytes(data),
		senseprint_base_64: proofBytes(data),
		purpose_id: data.purposeId,
		encrypted_key_base_64: data.encryptedKey,
		...proofUnlockFields(data),
	});
	return mapDecryptResponse(upstream);
};

/**
 * Sign a SHA-256 digest with a face-derived key.
 * @param {Object} data
 */
const sign = async (data) => {
	const upstream = await postJson("/face-sign", {
		face_base_64: faceBytes(data),
		senseprint_base_64: proofBytes(data),
		purpose_id: data.purposeId,
		data_sha256_base_64: data.dataSha256,
		key_type: data.keyType || "Secp256k1",
		...proofUnlockFields(data),
	});
	return mapSignResponse(upstream);
};

/**
 * Derive the face public key for a purpose id.
 * @param {Object} data
 */
const publicKey = async (data) => {
	const upstream = await postJson("/face-public-key", {
		face_base_64: faceBytes(data),
		senseprint_base_64: proofBytes(data),
		purpose_id: data.purposeId,
		key_type: data.keyType || "Secp256k1",
		...proofUnlockFields(data),
	});
	return mapPublicKeyResponse(upstream);
};

/**
 * Verify a signature with a Face Certificate.
 * @param {Object} data
 */
const verifySignature = async (data) => {
	const upstream = await postJson("/verify-face-signature", {
		data_sha256_base_64: data.dataSha256,
		signature_base_64: data.signature,
		face_certificate_pem: data.certificate,
	});
	return mapValidResponse(upstream);
};

/**
 * Verify a signature with a PEM public key.
 * @param {Object} data
 */
const verifySignatureWithPublicKey = async (data) => {
	const upstream = await postJson("/verify-face-signature-with-public-key", {
		data_sha256_base_64: data.dataSha256,
		signature_base_64: data.signature,
		public_key_pem: data.publicKey,
	});
	return mapValidResponse(upstream);
};

module.exports = {
	KEY_TYPES,
	SIGNING_KEY_TYPES,
	rootCertificate,
	generate,
	verify,
	encrypt,
	decrypt,
	sign,
	publicKey,
	verifySignature,
	verifySignatureWithPublicKey,
};
