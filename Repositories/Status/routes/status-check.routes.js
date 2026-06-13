const config = require("../../../Core/config");

const Controller = require("../controllers/status-check.controller");

const base = "/status";

module.exports = (server) => {
	const PATH = config.basePath(base);

	server.get(`${PATH}/`, Controller.getLatest);

	server.get(`${PATH}/failures`, Controller.getFailures);

	server.get(`${PATH}/run/:runId`, Controller.getRunResults);

	server.get(`${PATH}/history/:endpoint`, Controller.getEndpointHistory);
};
