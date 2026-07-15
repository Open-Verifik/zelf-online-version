const config = require("../../../Core/config");
const Controller = require("../controllers/ton-payment.controller");

const base = "/ton";

module.exports = (server) => {
	const PATH = config.basePath(base);

	// Tag payment destination — public (no JWT), same pattern as Solana service-wallet intent
	server.get(`${PATH}/payment/service-wallet`, Controller.getServiceWallet);
};
