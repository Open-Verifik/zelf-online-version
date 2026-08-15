const config = require("../../../Core/config");

const Controller = require("../controllers/human-authn.controller");
const Middleware = require("../middlewares/human-authn.middleware");

const base = "/jwt/human-authn";

/**
 * Development-only mirror of `/api/human-authn`. Trades the ZNS payment gate for
 * the JWT that the protected registry already enforces, so local tests can run
 * without on-chain payments. Usage metering for unpaid calls is still undecided,
 * so this must not reach production.
 */
module.exports = (server) => {
    if (config.env !== "development") return;

    const PATH = config.basePath(base);

    server.post(`${PATH}/encrypt`, Middleware.encryptValidation, Controller.encrypt);
    server.post(`${PATH}/encrypt-qr-code`, Middleware.encryptValidation, Controller.encryptQRCode);
    server.post(`${PATH}/decrypt`, Middleware.decryptValidation, Controller.decrypt);
    server.post(`${PATH}/preview`, Middleware.previewValidation, Controller.preview);
    server.post(`${PATH}/upgrade`, Middleware.upgradeValidation, Controller.upgrade);

    console.info(`[dev] JWT routes mounted at ${PATH} (no ZNS payment)`);
};
