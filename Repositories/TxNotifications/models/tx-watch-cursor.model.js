const mongoose = require("mongoose");

const { Schema } = mongoose;

/**
 * Polling state for one on-chain account, shared by every device that watches
 * it. `state` is adapter-specific (last block, last signature per token
 * account, Sui page cursor, Horizon paging token...). `seen` keeps the most
 * recent transfer hashes so a re-listed transfer is never considered new.
 */
const SEEN_CAP = 300;

const TxWatchCursorSchema = new Schema(
    {
        /** `network:normalizedAddress` */
        key: { type: String, required: true, unique: true },
        network: { type: String, required: true },
        /** Address in the form the chain API expects. */
        queryAddress: { type: String, required: true },
        seededAt: { type: Date, default: null },
        state: { type: Schema.Types.Mixed, default: () => ({}) },
        seen: { type: [String], default: [] },
        nextCheckAt: { type: Date, required: true },
        lastCheckedAt: { type: Date, default: null },
        errorCount: { type: Number, default: 0 },
        backoffUntil: { type: Date, default: null },
        /** Provider error code/message only; never an address. */
        lastError: { type: String, default: null },
    },
    { timestamps: true, collection: "TxWatchCursors", minimize: false }
);

TxWatchCursorSchema.index({ nextCheckAt: 1 });

module.exports = mongoose.models.TxWatchCursor || mongoose.model("TxWatchCursor", TxWatchCursorSchema);
module.exports.SEEN_CAP = SEEN_CAP;
