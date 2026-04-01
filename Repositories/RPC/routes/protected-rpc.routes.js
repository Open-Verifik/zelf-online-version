const config = require("../../../Core/config");
const Controller = require("../controllers/rpc.controller");
const Middleware = require("../middlewares/rpc.middleware");
const { requireAllowedProtectedRpcOrigin } = require("../middlewares/protected-rpc-origin.middleware");

const base = "/protected/rpc";

module.exports = (server) => {
    const PATH = config.basePath(base);

    server.get(`${PATH}/chains`, requireAllowedProtectedRpcOrigin, Controller.getExtensionChains);
    server.post(
        `${PATH}/:chainKey`,
        requireAllowedProtectedRpcOrigin,
        Middleware.jsonRpcValidationExtension,
        Controller.requestExtensionJsonRpc
    );
};
