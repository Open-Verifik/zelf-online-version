const config = require("../../../Core/config");
const Controller = require("../controllers/toncoin-scrapping.controller");

const base = "/ton";

module.exports = (server) => {
	const PATH = config.basePath(base);

	server.get(`${PATH}/address/:id`, Controller.getAddress);

	server.get(`${PATH}/address/:id/transactions`, Controller.transactionsList);

	server.get(`${PATH}/transaction/:id`, Controller.getTransactionDetail);
};
