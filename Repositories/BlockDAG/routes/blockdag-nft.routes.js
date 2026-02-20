const config = require("../../../Core/config");
const Controller = require("../controllers/blockdag-nft.controller");
const Middleware = require("../middlewares/blockdag-nft.middleware");

const base = "/blockdag/nft";

module.exports = (server) => {
    const PATH = config.basePath(base);

    // Protected: Upload, Create Collection & Item
    server.post(`${PATH}/upload`, Controller.upload);
    server.post(`${PATH}/collection`, Middleware.createCollectionValidation, Controller.createCollection);
    server.post(`${PATH}/item`, Middleware.createNFTValidation, Controller.createNFT);
};
