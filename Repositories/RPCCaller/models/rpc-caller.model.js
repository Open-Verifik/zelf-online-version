const mongoose = require("mongoose");

const rpcCallerSchema = new mongoose.Schema(
	{
		ip: {
			type: String,
			required: true,
			unique: true,
			trim: true,
			maxlength: 45,
		},
		requestCount: {
			type: Number,
			required: true,
			default: 0,
			min: 0,
		},
		firstSeenAt: {
			type: Date,
			required: true,
			default: Date.now,
		},
		lastSeenAt: {
			type: Date,
			required: true,
			default: Date.now,
		},
		banned: {
			type: Boolean,
			required: true,
			default: false,
		},
		bannedAt: {
			type: Date,
			default: null,
		},
		bannedReason: {
			type: String,
			default: null,
			maxlength: 500,
		},
	},
	{
		timestamps: true,
		collection: "RPCCallers",
	}
);

rpcCallerSchema.index({ requestCount: -1 });
rpcCallerSchema.index({ banned: 1, requestCount: -1 });
rpcCallerSchema.index({ lastSeenAt: -1 });

module.exports = mongoose.model("RpcCaller", rpcCallerSchema);
