const config = require("../../../Core/config");
const Controller = require("../controllers/blockdag.controller");

const blockdag = "/blockdag";

module.exports = (server) => {
    const PATH = config.basePath(blockdag);

    server.get(`${PATH}/price`, Controller.getPrice);
};
