const config = require("../../../Core/config");

const Controller = require("../controllers/subscriber.controller");

const Middleware = require("../middlewares/subscriber.middleware");

const base = "/subscribers";

module.exports = (server) => {
	const PATH = config.basePath(base);

	server.post(`${PATH}`, Middleware.subscribeValidation, Controller.subscribe);

	server.post(`${PATH}/unsubscribe`, Middleware.unsubscribeValidation, Controller.unsubscribe);
};
