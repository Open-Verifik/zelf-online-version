const config = require("../../../Core/config");
const Controller = require("../controllers/blockdag-nft.controller");

const base = "/blockdag/nft";

module.exports = (server) => {
    const PATH = config.basePath(base);

    // Public: List Collections & Items
    server.get(`${PATH}/collections`, Controller.getCollections);
    server.get(`${PATH}/items`, Controller.getItems);

    // Public: Get a single NFT item by IPFS/Pinata ID
    server.get(`${PATH}/item/:id`, Controller.getItem);

    // Public: Get the official default Zelf Name Service collection address
    server.get(`${PATH}/default-collection`, Controller.getDefaultCollection);
};
