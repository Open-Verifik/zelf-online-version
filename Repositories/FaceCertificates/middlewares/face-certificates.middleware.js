const { string, validate, boolean, array, stringEnum } = require("../../../Core/JoiUtils");
const { KEY_TYPES, SIGNING_KEY_TYPES } = require("../modules/face-certificates.module");

const osEnum = stringEnum(["DESKTOP", "ANDROID", "IOS"]);
const livenessEnum = stringEnum(["REGULAR", "SOFT", "HARDENED"]);

const proofUnlock = {
	os: osEnum,
	password: string(),
	livenessLevel: livenessEnum,
	livenessTolerance: livenessEnum,
	verifierKey: string(),
};

const schemas = {
	generate: {
		faceBase64: string().required(),
		zelfProof: string().required(),
		purposeId: string().required(),
		userSubjectName: string().required(),
		expirationDateUtc: string().required(),
		keyType: stringEnum(KEY_TYPES),
		requestedAttributes: array().items(string()),
		attributePublicKey: string(),
		checkLiveFaceBeforeCreation: boolean(),
		...proofUnlock,
	},
	verify: {
		certificate: string().required(),
		attributePrivateKey: string(),
	},
	encrypt: {
		certificate: string().required(),
		keyBase64: string().required(),
	},
	decrypt: {
		faceBase64: string().required(),
		zelfProof: string().required(),
		purposeId: string().required(),
		encryptedKey: string().required(),
		...proofUnlock,
	},
	sign: {
		faceBase64: string().required(),
		zelfProof: string().required(),
		purposeId: string().required(),
		dataSha256: string().required(),
		keyType: stringEnum(SIGNING_KEY_TYPES),
		...proofUnlock,
	},
	publicKey: {
		faceBase64: string().required(),
		zelfProof: string().required(),
		purposeId: string().required(),
		keyType: stringEnum(KEY_TYPES),
		...proofUnlock,
	},
	verifySignature: {
		dataSha256: string().required(),
		signature: string().required(),
		certificate: string().required(),
	},
	verifySignatureWithPublicKey: {
		dataSha256: string().required(),
		signature: string().required(),
		publicKey: string().required(),
	},
};

const validation = (schema) => async (ctx, next) => {
	const valid = validate(schema, ctx.request.body);

	if (valid.error) {
		ctx.status = 409;
		ctx.body = { validationError: valid.error.message };
		return;
	}

	await next();
};

module.exports = {
	generateValidation: validation(schemas.generate),
	verifyValidation: validation(schemas.verify),
	encryptValidation: validation(schemas.encrypt),
	decryptValidation: validation(schemas.decrypt),
	signValidation: validation(schemas.sign),
	publicKeyValidation: validation(schemas.publicKey),
	verifySignatureValidation: validation(schemas.verifySignature),
	verifySignatureWithPublicKeyValidation: validation(schemas.verifySignatureWithPublicKey),
};
