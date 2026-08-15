const Module = require("../modules/face-certificates.module");

const handle = (fn) => async (ctx) => {
	try {
		ctx.body = await fn(ctx.request.body);
	} catch (error) {
		console.error(error);
		ctx.status = error.status || 500;
		ctx.body = { error: error.message, code: error.code };
	}
};

const rootCertificate = async (ctx) => {
	try {
		ctx.body = await Module.rootCertificate();
	} catch (error) {
		console.error(error);
		ctx.status = error.status || 500;
		ctx.body = { error: error.message, code: error.code };
	}
};

module.exports = {
	rootCertificate,
	generate: handle(Module.generate),
	verify: handle(Module.verify),
	encrypt: handle(Module.encrypt),
	decrypt: handle(Module.decrypt),
	sign: handle(Module.sign),
	publicKey: handle(Module.publicKey),
	verifySignature: handle(Module.verifySignature),
	verifySignatureWithPublicKey: handle(Module.verifySignatureWithPublicKey),
};
