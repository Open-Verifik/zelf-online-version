const config = require("../../../Core/config");

const Controller = require("../controllers/article.controller");

const Middleware = require("../middlewares/article.middleware");

const base = "/articles";

module.exports = (server) => {
    const PATH = config.basePath(base);

    // CRUD
    server.post(`${PATH}`, Middleware.createValidation, Controller.create);

    server.get(`${PATH}`, Controller.getAll);

    server.get(`${PATH}/:slug`, Controller.getBySlug);

    // Newsletter sending
    server.post(`${PATH}/:slug/send-test`, Middleware.sendTestValidation, Controller.sendTest);

    server.post(`${PATH}/:slug/send-all`, Controller.sendToAll);

    // Open tracking pixel (unprotected)
    server.get(`${PATH}/track/:articleId/:subscriberEmail`, Controller.trackOpen);
};
