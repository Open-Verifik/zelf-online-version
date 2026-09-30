const DevicesModule = require("../modules/tx-notification-devices.module");
const { TxNotificationsError } = require("../modules/tx-notifications-errors");

/**
 * Errors answer `{ error, message }` (contract #566). The status is set on ctx
 * instead of thrown: server.js rewrites any thrown 401 into the generic JWT
 * message, which would hide `invalid_signature` / `stale_request`.
 */
const handle = (fn) => async (ctx) => {
    try {
        ctx.body = { data: await fn(ctx) };
    } catch (error) {
        if (error instanceof TxNotificationsError) {
            ctx.status = error.status;
            ctx.body = { error: error.code, message: error.message };
            return;
        }

        console.error("[tx-notifications] request failed:", error?.message || error);
        ctx.status = 500;
        ctx.body = { error: "internal_error", message: "could not process the request" };
    }
};

const registerDevice = handle((ctx) => DevicesModule.registerDevice(ctx.request.body));

const unregisterDevice = handle((ctx) =>
    DevicesModule.unregisterDevice(ctx.params.pushSubscriptionId, ctx.get("X-Device-Secret") || undefined)
);

module.exports = {
    registerDevice,
    unregisterDevice,
};
