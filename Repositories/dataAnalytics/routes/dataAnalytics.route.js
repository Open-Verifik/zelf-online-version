const config = require("../../../Core/config");
const Controller = require("../controllers/dataAnalytics.controller");

const Middleware = require("../middlewares/dataAnalytics.middleware");

const base = "/asset";

module.exports = (server) => {
	const PATH = config.basePath(base);

	server.get(`${PATH}/chart/:asset`, Middleware.validateChart, Controller.chart_data);

	server.get(`${PATH}/:asset/:currency`, Controller.data_analytics);
};
