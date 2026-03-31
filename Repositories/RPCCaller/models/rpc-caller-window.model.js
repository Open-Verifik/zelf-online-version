const mongoose = require("mongoose");

/** Rolling-window rate limit buckets: one document per caller IP per UTC minute. */
const rpcCallerWindowSchema = new mongoose.Schema(
	{
		ip: {
			type: String,
			required: true,
			trim: true,
			maxlength: 45,
		},
		/** Start of the UTC minute (aligned to 60s boundary). */
		windowStart: {
			type: Date,
			required: true,
		},
		count: {
			type: Number,
			required: true,
			default: 0,
			min: 0,
		},
		/** TTL cleanup: remove bucket long after it is irrelevant for rolling sums. */
		expiresAt: {
			type: Date,
			required: true,
			expires: 0,
		},
	},
	{
		timestamps: false,
		collection: "RPCCallerWindows",
	}
);

rpcCallerWindowSchema.index({ ip: 1, windowStart: 1 }, { unique: true });
rpcCallerWindowSchema.index({ ip: 1, windowStart: -1 });

module.exports = mongoose.model("RpcCallerWindow", rpcCallerWindowSchema);
