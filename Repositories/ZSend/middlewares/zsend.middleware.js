const { string, number, minMaxNumber, object, validate, stringEnum } = require("../../../Core/JoiUtils");
const { CIPHER_ALGORITHMS, ENVELOPE_KINDS, MAX_EXPIRES_IN_HOURS } = require("../modules/zsend-purpose.module");

const kindEnum = stringEnum(ENVELOPE_KINDS);

/** `validate` only allows unknown keys on the outer schema, so nested objects opt in. */
const openObject = (schema) => object(schema).unknown(true);

const schemas = {
	purposeId: {
		tagName: string().required(),
		domain: string(),
		kind: kindEnum,
	},
	lookupCertificate: {
		tagName: string().required(),
		domain: string(),
		kind: kindEnum,
	},
	publishCertificate: {
		tagName: string().required(),
		domain: string(),
		kind: kindEnum,
		certificate: string().required(),
		keyType: string(),
		userSubjectName: string(),
		certificateExpiresAt: string(),
	},
	revokeCertificate: {
		tagName: string().required(),
		domain: string(),
		kind: kindEnum,
	},
	createEnvelope: {
		toTagName: string().required(),
		domain: string(),
		kind: kindEnum,
		encryptedKey: string().required(),
		cipher: openObject({
			algorithm: stringEnum(CIPHER_ALGORITHMS),
			iv: string().required(),
			authTag: string(),
			cid: string(),
			url: string(),
			sha256: string(),
			byteLength: number(),
		}).required(),
		cipherBase64: string(),
		senderProof: openObject({
			signature: string().required(),
			purposeId: string(),
			certificate: string(),
			publicKey: string(),
			keyType: string(),
		}),
		filename: string(),
		mimeType: string(),
		expiresInHours: minMaxNumber(1, MAX_EXPIRES_IN_HOURS),
	},
	listEnvelopes: {
		box: stringEnum(["inbox", "outbox"]),
		kind: kindEnum,
	},
	pinBlob: {
		cipherBase64: string().required(),
		filename: string(),
	},
};

const validation = (schema, source) => async (ctx, next) => {
	const payload = source === "query" ? ctx.request.query : ctx.request.body;

	const valid = validate(schema, payload);

	if (valid.error) {
		ctx.status = 409;
		ctx.body = { validationError: valid.error.message };
		return;
	}

	await next();
};

const envelopeIdValidation = async (ctx, next) => {
	if (!ctx.params?.envelopeId) {
		ctx.status = 409;
		ctx.body = { validationError: "missing envelopeId" };
		return;
	}

	await next();
};

module.exports = {
	createEnvelopeValidation: validation(schemas.createEnvelope, "body"),
	envelopeIdValidation,
	listEnvelopesValidation: validation(schemas.listEnvelopes, "query"),
	lookupCertificateValidation: validation(schemas.lookupCertificate, "query"),
	pinBlobValidation: validation(schemas.pinBlob, "body"),
	publishCertificateValidation: validation(schemas.publishCertificate, "body"),
	purposeIdValidation: validation(schemas.purposeId, "query"),
	revokeCertificateValidation: validation(schemas.revokeCertificate, "body"),
};
