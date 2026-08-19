const config = require("../../../Core/config");
const Controller = require("../controllers/zsend.controller");
const Middleware = require("../middlewares/zsend.middleware");

const base = "/my-zsend";

/**
 * Owner operations: publishing a certificate, sending, and opening.
 * Registered in `Routes/protected-repositories.js`.
 */
module.exports = (server) => {
	const PATH = config.basePath(base);

	server.get(`${PATH}/certificates`, Controller.listMyCertificates);
	server.post(`${PATH}/certificates`, Middleware.publishCertificateValidation, Controller.publishCertificate);
	server.delete(`${PATH}/certificates`, Middleware.revokeCertificateValidation, Controller.revokeCertificate);

	server.post(`${PATH}/blobs`, Middleware.pinBlobValidation, Controller.pinBlob);

	server.get(`${PATH}/envelopes`, Middleware.listEnvelopesValidation, Controller.listEnvelopes);
	server.post(`${PATH}/envelopes`, Middleware.createEnvelopeValidation, Controller.createEnvelope);
	server.get(`${PATH}/envelopes/:envelopeId`, Middleware.envelopeIdValidation, Controller.getEnvelope);
	server.post(`${PATH}/envelopes/:envelopeId/opened`, Middleware.envelopeIdValidation, Controller.openEnvelope);
	server.delete(`${PATH}/envelopes/:envelopeId`, Middleware.envelopeIdValidation, Controller.revokeEnvelope);
};
