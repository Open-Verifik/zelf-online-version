const config = require("../../../Core/config");

const Controller = require("../controllers/wallet.controller");
const Middleware = require("../middlewares/wallet.middleware");
const primaryKey = "id";
const base = "/my-wallets";

module.exports = (server) => {
	const PATH = config.basePath(base);

	server.get(PATH, Middleware.getValidation, Controller.get);

	server.get(`${PATH}/:${primaryKey}`, Middleware.showValidation, Controller.show);

	server.post(`${PATH}`, Middleware.createValidation, Controller.create);

	server.post(`${PATH}/import`, Middleware.importValidation, Controller.importWallet);

	server.post(`${PATH}/decrypt`, Middleware.decryptWalletValidation, Controller.decryptWallet);

	server.post(`${PATH}/ipfs`, Middleware.ipfsValidation, Controller.ipfsUpload);

	server.post(`${PATH}/validate-zk-proof`, Middleware.zkProofValidation, Controller.zkProof);
};
