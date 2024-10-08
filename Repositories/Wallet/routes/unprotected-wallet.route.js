const config = require("../../../Core/config");
const Controller = require("../controllers/wallet.controller");

const Middleware = require("../middlewares/wallet.middleware");

const base = "/wallets";

module.exports = (server) => {
	const PATH = config.basePath(base);

	server.get(`${PATH}`, Middleware.searchOpenWalletsValidation, Controller.searchOpenWallets);

	server.post(`${PATH}`, Middleware.createValidation, Controller.create);

	server.post(`${PATH}/preview`, Middleware.seeWalletValidation, Controller.seeWallet);
};
