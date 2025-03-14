const config = require("../../../Core/config");
const Controller = require("../controllers/binance.controller");

const Middleware = require("../middlewares/binance.middleware");

const base = "/assets";

module.exports = (server) => {
	const PATH = config.basePath(base);

	server.get(`${PATH}/price`, Controller.tickerPrice);

	server.get(`${PATH}/klines`, Middleware.validateParamas, Controller.Klines);
};
