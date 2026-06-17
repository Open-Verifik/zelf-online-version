const config = require("../../../Core/config");
const Controller = require("../controllers/ton-payment.controller");
const Middleware = require("../middlewares/ton-middleware");
const SessionMiddleware = require("../../Session/middlewares/session.middleware");

const base = "/ton";

module.exports = (server) => {
	const PATH = config.basePath(base);

	server.get(`${PATH}/payment/service-wallet`, Controller.getServiceWallet);

	server.post(`${PATH}/payment/confirm`, SessionMiddleware.validateJWT, Middleware.confirmPaymentValidation, Controller.confirmPayment);

	const TransferController = require("../controllers/ton-transfer.controller");
	server.post(`${PATH}/transfer/send`, SessionMiddleware.validateJWT, Middleware.sendTransferValidation, TransferController.sendTransfer);

	server.post(`${PATH}/transfer/jetton`, SessionMiddleware.validateJWT, Middleware.sendTransferValidation, TransferController.sendJetton);
};
