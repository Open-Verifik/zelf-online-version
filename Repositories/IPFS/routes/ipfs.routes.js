const config = require("../../../Core/config");

const Controller = require("../controllers/ipfs.controller");

const Middleware = require("../middlewares/ipfs.middleware");

const base = "/ipfs";

module.exports = (server) => {
	const PATH = config.basePath(base);

	server.get(PATH, Middleware.getValidation, Controller.get);

	server.get(`${PATH}/:cid`, Middleware.showValidation, Controller.show);

	server.post(`${PATH}`, Middleware.createValidation, Controller.create);

	server.del(`${PATH}/:id`, Middleware.deleteValidation, Controller.destroy);
};
