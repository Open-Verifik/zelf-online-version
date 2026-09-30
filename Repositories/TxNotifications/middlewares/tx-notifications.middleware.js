const { isValidPushSubscriptionId } = require("../modules/registration-input.util");

/**
 * Cheap request guards before the module runs. Body validation lives in
 * modules/registration-input.util.js because the contract fixes the order of
 * the checks (shape, signature, freshness, then addresses).
 */

const reject = (ctx, status, error, message) => {
    ctx.status = status;
    ctx.body = { error, message };
};

const registerDeviceValidation = async (ctx, next) => {
    const body = ctx.request.body;
    if (!body || typeof body !== "object" || Array.isArray(body)) {
        return reject(ctx, 400, "invalid_request", "body must be a JSON object");
    }

    return next();
};

const unregisterDeviceValidation = async (ctx, next) => {
    if (!isValidPushSubscriptionId(ctx.params.pushSubscriptionId)) {
        return reject(ctx, 400, "invalid_request", "pushSubscriptionId is malformed");
    }

    return next();
};

module.exports = {
    registerDeviceValidation,
    unregisterDeviceValidation,
};
