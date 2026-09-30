const mongoose = require("mongoose");

const { Schema } = mongoose;

/**
 * A phone registered for received-transfer push. One document per OneSignal
 * push subscription id; re-registering replaces the addresses and rotates the
 * secret. Only a SHA-256 of the device secret is stored.
 *
 * `expiresAt` drives a TTL index: it moves forward on every registration and
 * every delivered push, and is set to `disabledAt + retention` when OneSignal
 * reports the subscription as invalid, so stale and disabled devices vanish on
 * their own.
 */
const AddressSchema = new Schema(
    {
        network: { type: String, required: true },
        /** Exactly as the app sent (and signed) it. */
        address: { type: String, required: true },
        /** `network:normalizedAddress`, shared with TxWatchCursor.key */
        key: { type: String, required: true },
        /** Transfers older than this are never pushed to this device (registration-time rule). */
        since: { type: Date, required: true },
    },
    { _id: false }
);

const TxNotificationDeviceSchema = new Schema(
    {
        pushSubscriptionId: { type: String, required: true, unique: true },
        platform: { type: String, enum: ["android", "ios"], required: true },
        language: { type: String, default: "en" },
        appVersion: { type: String, default: null },
        tagName: { type: String, default: null },
        /** Lowercase EVM address that signed the registration. */
        ownerEth: { type: String, required: true },
        /** Networks the app sent, watched or not (polkadot/kusama are accepted, not watched). */
        addresses: { type: [AddressSchema], default: [] },
        /** Keys of the watched addresses only; the watcher looks devices up by these. */
        watchKeys: { type: [String], default: [] },
        enabled: { type: Boolean, default: true },
        disabledReason: { type: String, default: null },
        disabledAt: { type: Date, default: null },
        secretHash: { type: String, required: true },
        /** Last accepted `issuedAt`; a registration must be newer (blocks replays within the 10-minute window). */
        lastIssuedAt: { type: Date, required: true },
        registeredAt: { type: Date, required: true },
        lastSeenAt: { type: Date, required: true },
        lastDeliveredAt: { type: Date, default: null },
        expiresAt: { type: Date, required: true },
    },
    { timestamps: true, collection: "TxNotificationDevices" }
);

TxNotificationDeviceSchema.index({ watchKeys: 1, enabled: 1 });
TxNotificationDeviceSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

module.exports = mongoose.models.TxNotificationDevice || mongoose.model("TxNotificationDevice", TxNotificationDeviceSchema);
