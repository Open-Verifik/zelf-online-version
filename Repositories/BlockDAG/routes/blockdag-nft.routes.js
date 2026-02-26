const config = require("../../../Core/config");
const Controller = require("../controllers/blockdag-nft.controller");
const Middleware = require("../middlewares/blockdag-nft.middleware");

const base = "/blockdag/nft";

module.exports = (server) => {
    const PATH = config.basePath(base);

    // Protected: Upload, Create Collection & Item
    server.post(`${PATH}/upload`, Controller.upload);

    server.post(`${PATH}/collection`, Middleware.createCollectionValidation, Controller.createCollection);
    
    server.patch(`${PATH}/collection/:id`, Middleware.updateCollectionValidation, Controller.updateCollection);
    
    server.post(`${PATH}/item`, Middleware.createNFTValidation, Controller.createNFT);
    // Protected: Server-side mint for shared/owner-only collections (uses deployer key)
    server.post(`${PATH}/item/mint`, Middleware.mintNFTValidation, Controller.mintNFT);
    
    server.post(`${PATH}/collection/:id/delete`, Middleware.deleteCollectionValidation, Controller.deleteCollection);
};
