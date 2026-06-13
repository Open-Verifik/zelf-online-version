const config = require("../../../Core/config");

const Controller = require("../controllers/whatsapp.controller");

const Middleware = require("../middlewares/whatsapp.middleware");

const base = "/whatsapp";

module.exports = (server) => {
	const PATH = config.basePath(base);

	server.post(
		`${PATH}/messages`,
		Middleware.relayApiKeyValidation,
		Middleware.sendMessageValidation,
		Controller.sendMessage
	);
};
