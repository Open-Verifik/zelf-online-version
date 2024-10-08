const config = require("../../../Core/config");
const Controller = require("../controllers/etherscan.controller");

const Middleware = require("../middlewares/etherscan.middleware");

const base = "/wallets";

module.exports = (server) => {
	const PATH = config.basePath(base);

	server.post(`${PATH}/balance`, Middleware.validateAddress, Controller.balance);

	server.post(`${PATH}/blockNumber`, Controller.blocke);

	server.post(`${PATH}/transactions`, Middleware.validateAddress, Controller.transactions);

	server.post(`${PATH}/tokentx`, Middleware.validateAddress, Controller.tokentx);

	server.post(`${PATH}/gastracker`, Controller.gasTracker);
};
