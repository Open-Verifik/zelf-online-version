const mongoose = require("mongoose");

const { Schema } = mongoose;

/**
 * Idempotency ledger: a transfer (network + hash) is pushed at most once per
 * device. The watcher inserts the row *before* calling OneSignal, so a crash or
 * a second watcher can never send the same transfer twice. Failed sends keep
 * their payload for a bounded retry. Rows expire after 30 days.
 *
 * Summary pushes get their own row (`hash: "summary:<digest>"`) plus one
 * `summarized` row per transfer they cover.
 */
const TxPushLogSchema = new Schema(
    {
        network: { type: String, required: true },
        hash: { type: String, required: true },
        pushSubscriptionId: { type: String, required: true },
        deviceId: { type: Schema.Types.ObjectId, default: null },
        kind: { type: String, enum: ["individual", "summary", "summarized"], required: true },
        status: {
            type: String,
            enum: ["pending", "sent", "failed", "dry_run", "invalid_subscription", "summarized", "abandoned"],
            default: "pending",
        },
        attempts: { type: Number, default: 0 },
        notificationId: { type: String, default: null },
        lastError: { type: String, default: null },
        /** OneSignal request body kept for retries (short sender only, never full addresses). */
        payload: { type: Schema.Types.Mixed, default: null },
        createdAt: { type: Date, default: Date.now },
        updatedAt: { type: Date, default: Date.now },
    },
    { collection: "TxPushLogs", minimize: false }
);

TxPushLogSchema.index({ network: 1, hash: 1, pushSubscriptionId: 1 }, { unique: true });
TxPushLogSchema.index({ status: 1, createdAt: 1 });
TxPushLogSchema.index({ createdAt: 1 }, { expireAfterSeconds: 30 * 24 * 60 * 60 });

module.exports = mongoose.models.TxPushLog || mongoose.model("TxPushLog", TxPushLogSchema);
