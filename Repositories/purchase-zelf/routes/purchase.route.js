const config = require("../../../Core/config");
const Controller = require("../controllers/purchase.controller");

const Middleware = require("../middlewares/purchase.middleware");

const base = "/payment";

module.exports = (server) => {
	const PATH = config.basePath(base);

	server.post(`${PATH}/search_zelf_lease`, Controller.searchZelfLease);

	server.post(`${PATH}/select-method`, Controller.selectMethod);

	server.post(`${PATH}/pay/:zelfName`, Controller.pay);

	server.post(`${PATH}/receipt-email`, Middleware.validateParamasEmail, Controller.receiptEmail);
};
