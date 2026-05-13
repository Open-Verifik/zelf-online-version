const mongoose = require("mongoose");

const apiStatusRecordSchema = new mongoose.Schema(
	{
		endpoint: {
			type: String,
			required: true,
			index: true,
		},
		httpMethod: {
			type: String,
			required: true,
			enum: ["GET", "POST", "PUT", "PATCH", "DELETE"],
		},
		path: {
			type: String,
			required: true,
			index: true,
		},
		suite: {
			type: String,
			required: true,
			index: true,
		},
		runId: {
			type: String,
			required: true,
		},
		environment: {
			type: String,
			required: true,
			default: "production",
			enum: ["production", "staging", "development"],
		},
		status: {
			type: String,
			required: true,
			enum: ["passed", "failed"],
			index: true,
		},
		duration: {
			type: Number,
			required: true,
		},
		failureMessage: {
			type: String,
		},
		serverPort: {
			type: Number,
		},
		nodeVersion: {
			type: String,
		},
	},
	{
		timestamps: true,
	}
);

// Query: latest status per endpoint
apiStatusRecordSchema.index({ endpoint: 1, createdAt: -1 });

// Query: all results for a specific run
apiStatusRecordSchema.index({ runId: 1 });

// Query: history of a specific endpoint
apiStatusRecordSchema.index({ path: 1, createdAt: -1 });

// Query: all failures
apiStatusRecordSchema.index({ status: 1, createdAt: -1 });

// TTL: auto-delete records older than 30 days
apiStatusRecordSchema.index({ createdAt: 1 }, { expireAfterSeconds: 30 * 24 * 60 * 60 });

module.exports = mongoose.model("ApiStatusRecord", apiStatusRecordSchema);
