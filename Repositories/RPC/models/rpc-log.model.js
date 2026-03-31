const mongoose = require("mongoose");

const SEVEN_DAYS_SEC = 7 * 24 * 60 * 60;

const rpcLogSchema = new mongoose.Schema(
	{
		chain: {
			type: String,
			required: true,
		},
		chainId: {
			type: Number,
			required: true,
		},
		method: {
			type: String,
			required: true,
		},
		origin: {
			type: String,
			default: "wallet",
		},
		purpose: {
			type: String,
			default: "unspecified",
		},
		session: {
			type: String,
			default: null,
		},
		ip: {
			type: String,
			default: null,
		},
		success: {
			type: Boolean,
			required: true,
		},
		httpStatus: {
			type: Number,
		},
		errorMessage: {
			type: String,
			maxlength: 500,
			default: null,
		},
		expiresAt: {
			type: Date,
			default: Date.now,
			expires: SEVEN_DAYS_SEC,
		},
	},
	{
		timestamps: true,
		collection: "RPCLogs",
	}
);

rpcLogSchema.index({ createdAt: -1 });
rpcLogSchema.index({ chain: 1, method: 1, createdAt: -1 });

module.exports = mongoose.model("RpcLog", rpcLogSchema);
