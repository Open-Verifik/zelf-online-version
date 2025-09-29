const config = require("../../../Core/config");
const { searchTag } = require("./tags.module");
const moment = require("moment");
const { getCoinbaseCharge } = require("../../coinbase/modules/coinbase_commerce.module");
const { confirmPayUniqueAddress } = require("../../purchase-zelf/modules/balance-checker.module");
const { addPurchaseReward } = require("./tags-token.module");
const { getDomainConfig } = require("../config/supported-domains");

/**
 * Confirm payment with Coinbase
 * @param {string} coinbase_hosted_url
 * @returns {Object} - Payment confirmation
 */
const _confirmPaymentWithCoinbase = async (coinbase_hosted_url) => {
	const chargeID = coinbase_hosted_url?.split("/pay/")[1];

	if (!chargeID) {
		const error = new Error("coinbase_charge_id_not_found");
		error.status = 404;
		throw error;
	}

	const charge = await getCoinbaseCharge(chargeID);

	if (!charge) {
		const error = new Error("coinbase_charge_not_found");
		error.status = 404;
		throw error;
	}

	const timeline = charge.timeline;

	let confirmed = false;

	for (let index = 0; index < timeline.length; index++) {
		const _timeline = timeline[index];

		if (_timeline.status === "COMPLETED") {
			confirmed = true;
		}
	}

	return {
		...charge,
		confirmed: config.coinbase.forceApproval || confirmed,
	};
};

/**
 * Renew my tag
 * @param {Object} params
 * @param {Object} authUser
 */
const renewMyTag = async (params, authUser) => {
	const { tagName, domain, network, token } = params;
	const domainConfig = getDomainConfig(domain);

	if (!authUser || !authUser.tagName) {
		const error = new Error("tag_not_authenticated");
		error.status = 401;
		throw error;
	}

	// Verify the tag belongs to the user
	if (authUser.tagName !== `${tagName}.${domain}`) {
		const error = new Error("tag_not_owned");
		error.status = 403;
		throw error;
	}

	// Get current tag data
	const tagData = await searchTag({ tagName, domain }, authUser);

	if (tagData.available) {
		const error = new Error("tag_not_found");
		error.status = 404;
		throw error;
	}

	const tagObject = tagData.tagObject;

	// Check if tag is expired
	const expiresAt = moment(tagObject.publicData.expiresAt);
	const now = moment();

	if (expiresAt.isAfter(now)) {
		const error = new Error("tag_not_expired");
		error.status = 409;
		throw error;
	}

	// Get renewal price
	const renewalPrice = domainConfig.price || 0;

	if (renewalPrice > 0) {
		// Verify payment
		const paymentConfirmation = await confirmPayUniqueAddress({
			tagName: `${tagName}.${domain}`,
			domain,
			domainConfig,
			network,
			token,
		});

		if (!paymentConfirmation.confirmed) {
			const error = new Error("payment_not_confirmed");
			error.status = 402;
			throw error;
		}
	}

	// Renew the tag
	const renewedTag = await updateTag({ tagName, domain, duration: 1 }, authUser);

	// Add purchase reward
	await addPurchaseReward(authUser, domain, renewalPrice);

	return {
		tagName: `${tagName}.${domain}`,
		domain,
		domainConfig,
		renewedTag,
		expiresAt: renewedTag.expiresAt,
		renewedAt: moment().toISOString(),
	};
};

/**
 * Transfer my tag
 * @param {Object} params
 * @param {Object} authUser
 */
const transferMyTag = async (params, authUser) => {
	return "not-implemented";
};

/**
 * Update old tag object
 * @param {Object} tagObject
 * @param {string} domain
 */
const updateOldTagObject = async (tagObject, domain = "zelf") => {
	return "not-implemented";
};

/**
 * Add duration to tag (for RevenueCat webhook)
 * @param {Object} params - Parameters including tagName, domain, duration, eventID, eventPrice
 * @param {Object} preview - Tag preview object
 * @returns {Object} - Updated tag records
 */
const addDurationToTag = async (params, preview) => {
	return "not-implemented";
};

module.exports = {
	renewMyTag,
	transferMyTag,
	updateOldTagObject,
	addDurationToTag,
	// Utility functions
	_confirmPaymentWithCoinbase,
};
