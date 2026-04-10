const config = require("../../../Core/config");
const Controller = require("../controllers/app-version.controller");
const Middleware = require("../middlewares/app-version.middleware");

module.exports = (server) => {
    const PATH = config.basePath("app/version");

    server.get(`${PATH}`, Middleware.versionQueryValidation, Controller.getVersion);
};
