const config = require("../../../Core/config");
const Controller = require("../controllers/tx-notifications.controller");
const Middleware = require("../middlewares/tx-notifications.middleware");

const base = "/tx-notifications";

/**
 * Server push for received transfers (Zelf #566). JWT-protected; registered in
 * `Routes/protected-repositories.js`. The watcher that sends the pushes runs as
 * its own process: `npm run tx-watcher`.
 */
module.exports = (server) => {
    const PATH = config.basePath(base);

    server.post(`${PATH}/devices`, Middleware.registerDeviceValidation, Controller.registerDevice);
    server.delete(`${PATH}/devices/:pushSubscriptionId`, Middleware.unregisterDeviceValidation, Controller.unregisterDevice);
};
