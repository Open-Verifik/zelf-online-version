const config = require("../../../Core/config");
const Controller = require("../controllers/rpc.controller");
const Middleware = require("../middlewares/rpc.middleware");

const base = "/rpc";

module.exports = (server) => {
    const PATH = config.basePath(base);

    server.get(`${PATH}/chains`, Controller.getChains);
    server.post(`${PATH}/request`, Middleware.requestValidation, Controller.request);
    server.post(`${PATH}/:chainKey`, Middleware.jsonRpcValidation, Controller.requestJsonRpc);
};
