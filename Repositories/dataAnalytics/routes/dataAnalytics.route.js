const config = require("../../../Core/config");
const Controller = require("../controllers/dataAnalytics.controller");

const Middleware = require("../middlewares/dataAnalytics.middleware");

const base = "/asset/:network/:symbol";

module.exports = (server) => {
	const PATH = config.basePath(base);

	server.get(`${PATH}`, Middleware.validateAssetDetails, Controller.data_analytics);
};
