const config = require("../../../Core/config");
const Controller = require("../controllers/dataAnalytics.controller");

const Middleware = require("../middlewares/dataAnalytics.middleware");

const base = "/data-analytics";

module.exports = (server) => {
	const PATH = config.basePath(base);

	server.get(
		`${PATH}`,
		Middleware.validateAnalytics,
		Controller.data_analytics
	);
};
