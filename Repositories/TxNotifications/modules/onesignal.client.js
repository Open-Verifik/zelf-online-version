const axios = require("axios");

const config = require("../../../Core/config");

/**
 * OneSignal "create notification" over plain HTTPS
 * (POST https://api.onesignal.com/notifications, `Authorization: Key <app API key>`).
 * The key is IP-allowlisted to the production server.
 */

const INVALID_SUBSCRIPTION_MESSAGES = [/all included players are not subscribed/i, /not subscribed/i];

const errorList = (errors) => {
    if (!errors) return [];
    if (Array.isArray(errors)) return errors.map(String);
    if (typeof errors === "string") return [errors];
    return [];
};

/**
 * Maps a OneSignal response to what the watcher does next:
 * - `sent`: delivered to OneSignal (`notificationId`).
 * - `invalid_subscription`: the subscription is gone/unsubscribed → disable the device.
 * - `auth_error` / `rate_limited`: stop sending this cycle, retry later.
 * - `failed`: `retryable` tells whether the same payload may be sent again.
 */
const interpretOneSignalResponse = (status, body, pushSubscriptionId) => {
    const errors = body?.errors;
    const invalidIds = [
        ...(Array.isArray(errors?.invalid_player_ids) ? errors.invalid_player_ids : []),
        ...(Array.isArray(errors?.invalid_subscription_ids) ? errors.invalid_subscription_ids : []),
    ].map(String);
    const messages = errorList(errors);

    if (invalidIds.includes(String(pushSubscriptionId)) || messages.some((m) => INVALID_SUBSCRIPTION_MESSAGES.some((re) => re.test(m)))) {
        return { outcome: "invalid_subscription", notificationId: body?.id || null, error: "subscription_not_subscribed" };
    }

    if (status === 401 || status === 403) return { outcome: "auth_error", retryable: true, error: `onesignal_http_${status}` };
    if (status === 429) return { outcome: "rate_limited", retryable: true, error: "onesignal_http_429" };
    if (status >= 500) return { outcome: "failed", retryable: true, error: `onesignal_http_${status}` };

    if (status >= 200 && status < 300 && body?.id) {
        return { outcome: "sent", notificationId: String(body.id) };
    }

    return {
        outcome: "failed",
        retryable: false,
        error: (messages[0] || `onesignal_http_${status}`).slice(0, 200),
    };
};

const isConfigured = () => Boolean(config.oneSignal?.appId && config.oneSignal?.appApiKey);

/** Sends one notification. Never throws; network errors come back as retryable failures. */
const sendNotification = async (payload) => {
    if (!isConfigured()) return { outcome: "failed", retryable: true, error: "onesignal_not_configured" };

    try {
        const response = await axios.post(`${config.oneSignal.apiUrl}/notifications?c=push`, payload, {
            headers: {
                Authorization: `Key ${config.oneSignal.appApiKey}`,
                "Content-Type": "application/json",
                Accept: "application/json",
            },
            timeout: config.oneSignal.timeoutMs,
            validateStatus: () => true,
        });

        return interpretOneSignalResponse(response.status, response.data, payload.include_subscription_ids?.[0]);
    } catch (error) {
        return { outcome: "failed", retryable: true, error: `onesignal_network_${error?.code || "error"}` };
    }
};

module.exports = {
    interpretOneSignalResponse,
    isConfigured,
    sendNotification,
};
