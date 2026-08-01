const config = require("../../../Core/config");
const ScrappingController = require("../controllers/aptos-scrapping.controller");
const TransferController = require("../controllers/aptos-transfer.controller");
const Middleware = require("../middlewares/aptos.middleware");
const SessionMiddleware = require("../../Session/middlewares/session.middleware");

const base = "/aptos";

module.exports = (server) => {
    const PATH = config.basePath(base);

    server.get(`${PATH}/address/:id`, SessionMiddleware.validateJWT, ScrappingController.address);
    server.get(
        `${PATH}/address/:id/transactions`,
        SessionMiddleware.validateJWT,
        Middleware.validateAddressTransactions,
        ScrappingController.transactions
    );
    server.get(`${PATH}/address/:id/tokens`, SessionMiddleware.validateJWT, Middleware.validateAddressTransactions, ScrappingController.tokens);
    server.get(`${PATH}/transaction/:id`, SessionMiddleware.validateJWT, ScrappingController.transaction);
    server.post(`${PATH}/transfer/estimate`, SessionMiddleware.validateJWT, Middleware.validateEstimateTransfer, TransferController.estimate);
    server.post(`${PATH}/transfer/send`, SessionMiddleware.validateJWT, Middleware.validateSendTransfer, TransferController.send);
};
