const Controller = require("../controllers/theme.controller");
const Middleware = require("../middlewares/theme.middleware");
const config = require("../../../Core/config");
const base = "/license/theme";

module.exports = (server) => {
	const PATH = config.basePath(base);

	server.get(`${PATH}`, Middleware.getThemeValidation, Controller.getThemeSettings);
	server.post(`${PATH}`, Middleware.updateThemeValidation, Controller.updateThemeSettings);
};



