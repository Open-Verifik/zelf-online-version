const mongoose = require("mongoose");

const VerificationSchema = new mongoose.Schema(
  {
    chainId: { type: Number, required: true },
    address: { type: String, required: true, lowercase: true, index: true },
    isVerified: { type: Boolean, required: true },
    source: { type: String, enum: ["etherscan", "manual"], default: "etherscan" },
    checkedAt: { type: Date, default: Date.now },
    ttlAt: { type: Date, default: () => new Date(Date.now() + 1000 * 60 * 60 * 24 * 30) } // 30d
  },
  { timestamps: true }
);

VerificationSchema.index({ chainId: 1, address: 1 }, { unique: true });
VerificationSchema.index({ ttlAt: 1 }, { expireAfterSeconds: 0 });

module.exports = mongoose.model("contract_verifications", VerificationSchema);


