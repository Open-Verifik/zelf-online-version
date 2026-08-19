const { errorHandler } = require("../../../Core/http-handler");
const BlobsModule = require("../modules/zsend-blobs.module");
const CertificatesModule = require("../modules/zsend-certificates.module");
const EnvelopesModule = require("../modules/zsend-envelopes.module");
const PurposeModule = require("../modules/zsend-purpose.module");

const handle = (fn) => async (ctx) => {
	try {
		ctx.body = { data: await fn(ctx) };
	} catch (error) {
		const exception = errorHandler(error, ctx);

		ctx.status = exception.status;
		ctx.body = { message: exception.message, code: exception.code };
	}
};

/** Canonical purpose id for a name, so clients never hardcode the format. */
const purposeId = handle(async (ctx) => {
	const { tagName, domain, kind } = ctx.request.query;

	const normalizedKind = PurposeModule.normalizeKind(kind);
	const normalizedDomain = PurposeModule.normalizeDomain(domain);
	const fullTagName = PurposeModule.normalizeTagName(tagName, normalizedDomain);

	return {
		tagName: fullTagName,
		domain: normalizedDomain,
		kind: normalizedKind,
		purposeId: PurposeModule.purposeIdFor(fullTagName, { domain: normalizedDomain, kind: normalizedKind }),
		keyTypeDefault: "Secp256k1",
		contentKeyMinBytes: PurposeModule.CONTENT_KEY_MIN_BYTES,
		contentKeyMaxBytes: PurposeModule.CONTENT_KEY_MAX_BYTES,
		cipherAlgorithms: PurposeModule.CIPHER_ALGORITHMS,
	};
});

const lookupCertificate = handle((ctx) => CertificatesModule.lookup(ctx.request.query));

const publishCertificate = handle((ctx) => CertificatesModule.publish(ctx.request.body, ctx.state.user));

const listMyCertificates = handle((ctx) => CertificatesModule.listMine(ctx.request.query, ctx.state.user));

const revokeCertificate = handle((ctx) => CertificatesModule.revoke(ctx.request.body, ctx.state.user));

const createEnvelope = handle((ctx) => EnvelopesModule.create(ctx.request.body, ctx.state.user));

const listEnvelopes = handle((ctx) => EnvelopesModule.list(ctx.request.query, ctx.state.user));

const getEnvelope = handle((ctx) => EnvelopesModule.get({ envelopeId: ctx.params.envelopeId }, ctx.state.user));

const openEnvelope = handle((ctx) => EnvelopesModule.markOpened({ envelopeId: ctx.params.envelopeId }, ctx.state.user));

const revokeEnvelope = handle((ctx) => EnvelopesModule.revoke({ envelopeId: ctx.params.envelopeId }, ctx.state.user));

const pinBlob = handle((ctx) => BlobsModule.pinCiphertext(ctx.request.body, ctx.state.user));

module.exports = {
	createEnvelope,
	getEnvelope,
	listEnvelopes,
	listMyCertificates,
	lookupCertificate,
	openEnvelope,
	pinBlob,
	publishCertificate,
	purposeId,
	revokeCertificate,
	revokeEnvelope,
};
