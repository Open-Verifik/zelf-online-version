const config = require("../../../Core/config");
const Controller = require("../controllers/pre-sale.controller");

const base = "/presale";

module.exports = (server) => {
    const PATH = config.basePath(base);

    // POST /api/presale/create-session
    server.post(`${PATH}/create-session`, Controller.createSession);

    // POST /api/presale/receipt-email
    server.post(`${PATH}/receipt-email`, Controller.sendReceipt);

    // GET /api/presale/session-details
    server.get(`${PATH}/session-details`, Controller.getSessionDetails);
};
