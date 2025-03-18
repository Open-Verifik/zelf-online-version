const config = require("../../../Core/config");

const Controller = require("../controllers/rpc.controller");

const Middleware = require("../middlewares/rpc.middleware");

const base = "/rpc";

module.exports = (server) => {
	const PATH = config.basePath(base);

	server.post(`${PATH}/send`, Middleware.sendTransactionValidation, Controller.sendTransaction);
};
