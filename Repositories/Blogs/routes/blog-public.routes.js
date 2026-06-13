const config = require("../../../Core/config");
const Controller = require("../controllers/blog.controller");
const Middleware = require("../middlewares/blog.middleware");
const base = "/blogs";

module.exports = (server) => {
    const PATH = config.basePath(base);

    // Read routes (public)
    server.get(`${PATH}`, Controller.get);
    server.get(`${PATH}/lang/:locale`, Middleware.setLocaleFromParams, Controller.get);
    server.get(`${PATH}/:slug`, Controller.show);
};
