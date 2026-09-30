const mongoose = require("mongoose");

const { Schema } = mongoose;

/**
 * Single-writer lease for the tx watcher. Only the holder of an unexpired lease
 * polls chains and sends pushes; any other watcher process idles until the
 * lease expires (holder crashed or stopped).
 */
const TxWatcherLeaseSchema = new Schema(
    {
        _id: { type: String, required: true },
        holder: { type: String, required: true },
        leaseUntil: { type: Date, required: true },
        acquiredAt: { type: Date, default: Date.now },
        renewedAt: { type: Date, default: Date.now },
    },
    { collection: "TxWatcherLeases", versionKey: false }
);

module.exports = mongoose.models.TxWatcherLease || mongoose.model("TxWatcherLease", TxWatcherLeaseSchema);
