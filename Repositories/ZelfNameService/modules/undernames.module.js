const config = require("../../../Core/config");
const { initAnt, setAntRecord, resolveExpectedTransactionId } = require("../../Arweave/modules/ar-io-arns-shared.module");

/**
 * Create or refresh an ANT undername for a registered tag (production).
 * @param {Object} payload
 * @param {string} payload.parentName - ARNS parent name (unused; kept for callers)
 * @param {string} payload.undername - Record key prefix (tag name without domain suffix)
 * @param {string} [payload.domain='zelf']
 * @returns {Promise<Object|null>}
 */
const createUnderName = async (payload) => {
	const { undername, domain = "zelf" } = payload;

	if (!undername) return null;

	const recordKey = domain === "zelf" ? undername : `${undername}_${domain}`;
	const transactionId = resolveExpectedTransactionId(recordKey);

	try {
		const ant = initAnt();
		const records = await ant.getRecords();

		if (records[recordKey]?.transactionId === transactionId) {
			return {
				skipped: true,
				recordKey,
				transactionId,
				record: records[recordKey],
			};
		}

		const newUnderName = await setAntRecord({
			ant,
			recordKey,
			transactionId,
			ttlSeconds: 3600,
		});

		return {
			recordKey,
			transactionId,
			...newUnderName,
		};
	} catch (error) {
		console.error({ newUnderNameError: error });
		return null;
	}
};

module.exports = {
	createUnderName,
};
