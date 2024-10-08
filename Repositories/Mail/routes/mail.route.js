const config = require("../../../Core/config");

const Controller = require("../controllers/mail.controller");

const Middleware = require("../middlewares/mail.middleware");

const base = "/mail";

module.exports = (server) => {
	const PATH = config.basePath(base);

	server.post(`${PATH}/webhook`, Middleware.webhookValidator, Controller.webhookHandler);
};
