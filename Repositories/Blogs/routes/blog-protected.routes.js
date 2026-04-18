const config = require("../../../Core/config");
const Controller = require("../controllers/blog.controller");
const Middleware = require("../middlewares/blog.middleware");
const base = "/blogs";

module.exports = (server) => {
    const PATH = config.basePath(base);

    // Write routes (protected by SuperAdmin JWT logic)
    server.post(`${PATH}`, Middleware.verifySuperAdmin, Middleware.createValidation, Controller.create);
    server.put(`${PATH}/:id`, Middleware.verifySuperAdmin, Middleware.updateValidation, Controller.update);
    server.del(`${PATH}/:id`, Middleware.verifySuperAdmin, Controller.destroy);
};
