const config = require("../../../Core/config");
const Controller = require("../controllers/rpc-caller.controller");
const Middleware = require("../middlewares/rpc-caller.middleware");
const SessionMiddleware = require("../../Session/middlewares/session.middleware");

const base = "/rpc-callers";

module.exports = (server) => {
    const PATH = config.basePath(base);

    server.get(
        `${PATH}/top`,
        SessionMiddleware.validateJWT,
        Middleware.requireAdminSecret,
        Middleware.listTopValidation,
        Controller.listTop
    );

    server.post(
        `${PATH}/ban`,
        SessionMiddleware.validateJWT,
        Middleware.requireAdminSecret,
        Middleware.banValidation,
        Controller.ban
    );

    server.post(
        `${PATH}/unban`,
        SessionMiddleware.validateJWT,
        Middleware.requireAdminSecret,
        Middleware.unbanValidation,
        Controller.unban
    );
};
