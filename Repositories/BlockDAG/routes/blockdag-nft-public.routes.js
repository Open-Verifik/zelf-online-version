const config = require("../../../Core/config");
const Controller = require("../controllers/blockdag-nft.controller");

const base = "/blockdag/nft";

module.exports = (server) => {
    const PATH = config.basePath(base);

    // Public: List Collections & Items
    server.get(`${PATH}/collections`, Controller.getCollections);
    server.get(`${PATH}/items`, Controller.getItems);
    server.get(`${PATH}/collection/:id/items`, Controller.getCollectionItems);

    // Public: Get a single NFT item — by ?cid= (query) or by path param (CID or Pinata ID)
    server.get(`${PATH}/item`, Controller.getItemByQuery);

    server.get(`${PATH}/item/:id`, Controller.getItem);

    // Public: Get the official default Zelf Name Service collection address
    server.get(`${PATH}/default-collection`, Controller.getDefaultCollection);

    // Public: Persist on-chain tokenId after frontend mint (txHash serves as proof)
    server.patch(`${PATH}/item/:id/token`, Controller.updateTokenId);
};
