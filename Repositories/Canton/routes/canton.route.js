const config = require("../../../Core/config");
const Controller = require("../controllers/canton.controller");
const TransferController = require("../controllers/canton-transfer.controller");
const Middleware = require("../middlewares/canton.middleware");
const SessionMiddleware = require("../../Session/middlewares/session.middleware");

const base = "/canton";

module.exports = (server) => {
    const PATH = config.basePath(base);
    const session = SessionMiddleware.validateJWT;

    server.get(`${PATH}/status`, session, Middleware.validateStatus, Controller.status);
    server.get(`${PATH}/address/:id`, session, Middleware.validatePartyParam, Middleware.authorizeParty("params"), Controller.address);
    server.get(
        `${PATH}/address/:id/tokens`,
        session,
        Middleware.validatePartyParam,
        Middleware.authorizeParty("params"),
        Controller.tokens
    );
    server.get(
        `${PATH}/address/:id/transactions`,
        session,
        Middleware.validatePartyParam,
        Middleware.authorizeParty("params"),
        Middleware.validateTransactions,
        Controller.transactions
    );
    server.get(
        `${PATH}/address/:id/transactions/:updateId`,
        session,
        Middleware.validatePartyParam,
        Middleware.authorizeParty("params"),
        Controller.transaction
    );
    server.post(
        `${PATH}/transfer/prepare`,
        session,
        Middleware.validatePrepareTransfer,
        Middleware.authorizeParty("sender"),
        TransferController.prepare
    );
    server.post(
        `${PATH}/transfer/submit`,
        session,
        Middleware.validateSubmitTransfer,
        Middleware.authorizeParty("partyId"),
        TransferController.submit
    );
};
