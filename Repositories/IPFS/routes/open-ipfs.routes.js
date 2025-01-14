const config = require("../../../Core/config");

// const Controller = require("../controllers/ipfs.controller");

// const Middleware = require("../middlewares/ipfs.middleware");

const base = "/open/ipfs";

module.exports = (server) => {
	const PATH = config.basePath(base);

	// server.get(PATH, Middleware.getValidation, Controller.get);
};
