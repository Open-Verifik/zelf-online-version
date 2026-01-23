const mongoose = require("mongoose");
const Schema = mongoose.Schema;

// Lock schema to prevent race conditions across multiple processes
const PresaleLockSchema = new Schema({
    sessionId: {
        type: String,
        required: true,
        unique: true, // This ensures only one process can hold the lock
    },
    createdAt: {
        type: Date,
        default: Date.now,
        expires: 300, // 5 minutes TTL to prevent deadlocks
    },
});

const PresaleLock = mongoose.model("PresaleLock", PresaleLockSchema);

module.exports = PresaleLock;
