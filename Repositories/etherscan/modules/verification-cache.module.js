const Verification = require("../models/verification.model");

const DEFAULT_MAX_AGE_MS = Number(process.env.VERIFICATION_CACHE_MAX_AGE_MS || 7 * 24 * 60 * 60 * 1000); // 7 days

async function getVerification(chainId, address) {
	const doc = await Verification.findOne({ chainId, address: String(address).toLowerCase() }).lean();

	if (!doc) return null;

	if (!doc.checkedAt) return null;

	const age = Date.now() - new Date(doc.checkedAt).getTime();

	if (age > DEFAULT_MAX_AGE_MS) return null;

	return doc;
}

async function setVerification(chainId, address, isVerified, source = "etherscan") {
	const now = new Date();

	const ttlAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000); // 30 days

	return await Verification.updateOne(
		{ chainId, address: String(address).toLowerCase() },
		{ $set: { isVerified, source, checkedAt: now, ttlAt } },
		{ upsert: true }
	);
}

module.exports = { getVerification, setVerification };
