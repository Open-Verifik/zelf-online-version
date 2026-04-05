const config = require("../../../Core/config");

const Controller = require("../controllers/alchemy.controller");
const Middleware = require("../middlewares/alchemy.middleware");
const SessionMiddleware = require("../../Session/middlewares/session.middleware");

const base = "/alchemy";

module.exports = (server) => {
    const PATH = config.basePath(base);

    server.get(`${PATH}/balances`, SessionMiddleware.validateJWT, Middleware.getBalancesValidation, Controller.getBalances);
    server.get(`${PATH}/transactions`, SessionMiddleware.validateJWT, Middleware.getTransactionsValidation, Controller.getTransactions);
    server.get(`${PATH}/transaction`, SessionMiddleware.validateJWT, Middleware.getTransactionValidation, Controller.getTransaction);
};
