const config = require("../../../Core/config");
const Controller = require("../controllers/binance.controller");
const SessionMiddleware = require("../../Session/middlewares/session.middleware");
const Middleware = require("../middlewares/binance.middleware");

const base = "/assets";

module.exports = (server) => {
	const PATH = config.basePath(base);

	server.get(`${PATH}/price`, SessionMiddleware.validateJWT, Controller.tickerPrice);

	server.get(`${PATH}/klines`, SessionMiddleware.validateJWT, Middleware.validateParamas, Controller.Klines);
};
