const config = require("../../../Core/config");
const jwt = require("jsonwebtoken");
const { searchTag, createZelfPay, updateZelfPay } = require("./tags.module");
const moment = require("moment");
const { getTickerPrice } = require("../../binance/modules/binance.module");
const { getCoinbaseCharge } = require("../../coinbase/modules/coinbase_commerce.module");
const { confirmPayUniqueAddress } = require("../../purchase-zelf/modules/balance-checker.module");
const ArweaveModule = require("../../Arweave/modules/arweave.module");
const IPFSModule = require("../../IPFS/modules/ipfs.module");
const TagsPartsModule = require("./tags-parts.module");
const { addReferralReward, addPurchaseReward, getPurchaseReward } = require("./tags-token.module");
const { getDomainConfiguration } = require("./domain-registry.module");

/**
 * Get domain-specific configuration
 * @param {string} domain - Domain name
 * @returns {Object} - Domain configuration
 */
const getDomainConfig = (domain) => {
	try {
		return getDomainConfiguration(domain);
	} catch (error) {
		console.error(`Error getting domain config for ${domain}:`, error);
		return getDomainConfiguration("zelf"); // Fallback to zelf
	}
};

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
	const { tagName, domain, faceBase64, password } = params;
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

	// Decrypt the tag
	const decryptedTag = await decryptTag({ tagName, domain, faceBase64, password }, authUser);

	if (!decryptedTag) {
		const error = new Error("tag_decryption_failed");
		error.status = 409;
		throw error;
	}

	// Create new tag with same data but different owner
	const newTagData = {
		...tagObject,
		publicData: {
			...tagObject.publicData,
			transferredAt: moment().toISOString(),
			transferredFrom: authUser.email,
		},
	};

	// Store new version in IPFS
	const ipfsResult = await IPFSModule.insert(
		{
			base64: Buffer.from(JSON.stringify(newTagData, null, 2)).toString("base64"),
			metadata: {
				...newTagData.publicData,
				type: "tag",
				domain,
			},
			name: `${tagName}.${domain}`,
			pinIt: true,
		},
		{ pro: true }
	);

	// Store new version in Arweave
	const arweaveResult = await ArweaveModule.insert(
		{
			base64: Buffer.from(JSON.stringify(newTagData, null, 2)).toString("base64"),
			metadata: {
				...newTagData.publicData,
				type: "tag",
				domain,
			},
			name: `${tagName}.${domain}`,
		},
		{ pro: true }
	);

	return {
		tagName: `${tagName}.${domain}`,
		domain,
		domainConfig,
		ipfs: ipfsResult,
		arweave: arweaveResult,
		transferredAt: newTagData.publicData.transferredAt,
		transferredFrom: newTagData.publicData.transferredFrom,
	};
};

/**
 * How to renew my tag
 * @param {Object} params
 * @param {Object} authUser
 */
const howToRenewMyTag = async (params, authUser) => {
	const { tagName, domain } = params;
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

	// Get renewal price
	const renewalPrice = domainConfig.price || 0;

	// Get payment methods
	const paymentMethods = [];

	if (renewalPrice > 0) {
		// Add Coinbase payment
		paymentMethods.push({
			method: "coinbase",
			price: renewalPrice,
			currency: "USD",
			description: `Renewal for ${tagName}.${domain}`,
		});

		// Add crypto payment options
		const cryptoOptions = await getTickerPrice("BTC,ETH,SOL");

		for (const [symbol, price] of Object.entries(cryptoOptions)) {
			paymentMethods.push({
				method: "crypto",
				symbol,
				price: renewalPrice / price,
				currency: symbol,
				description: `Renewal for ${tagName}.${domain}`,
			});
		}
	}

	return {
		tagName: `${tagName}.${domain}`,
		domain,
		domainConfig,
		renewalPrice,
		paymentMethods,
		expiresAt: tagObject.publicData.expiresAt,
		daysUntilExpiry: moment(tagObject.publicData.expiresAt).diff(moment(), "days"),
	};
};

/**
 * Update old tag object
 * @param {Object} tagObject
 * @param {string} domain
 */
const updateOldTagObject = async (tagObject, domain = "zelf") => {
	const domainConfig = getDomainConfig(domain);

	// Add missing fields
	if (!tagObject.publicData.registeredAt) {
		tagObject.publicData.registeredAt = moment().toISOString();
	}

	if (!tagObject.publicData.domain) {
		tagObject.publicData.domain = domain;
	}

	if (!tagObject.publicData.domainConfig) {
		tagObject.publicData.domainConfig = domainConfig;
	}

	// Update the tag object
	tagObject.publicData.updatedAt = moment().toISOString();

	// Store updated version in IPFS
	const ipfsResult = await IPFSModule.insert(
		{
			base64: Buffer.from(JSON.stringify(tagObject, null, 2)).toString("base64"),
			metadata: {
				...tagObject.publicData,
				type: "tag",
				domain,
			},
			name: tagObject.publicData.tagName,
			pinIt: true,
		},
		{ pro: true }
	);

	// Store updated version in Arweave
	const arweaveResult = await ArweaveModule.insert(
		{
			base64: Buffer.from(JSON.stringify(tagObject, null, 2)).toString("base64"),
			metadata: {
				...tagObject.publicData,
				type: "tag",
				domain,
			},
			name: tagObject.publicData.tagName,
		},
		{ pro: true }
	);

	return {
		...tagObject,
		updatedIpfs: ipfsResult,
		updatedArweave: arweaveResult,
	};
};

/**
 * Add duration to tag (for RevenueCat webhook)
 * @param {Object} params - Parameters including tagName, domain, duration, eventID, eventPrice
 * @param {Object} preview - Tag preview object
 * @returns {Object} - Updated tag records
 */
const addDurationToTag = async (params, preview) => {
	const { tagName, domain, duration, eventID, eventPrice } = params;
	const domainConfig = getDomainConfig(domain);

	// Find the tag
	const searchParams = {
		tagName: `${tagName}.${domain}`,
		domain,
		key: "tagName",
		value: `${tagName}.${domain}`,
	};

	const searchResult = await searchTag(searchParams, {});

	if (!searchResult.tagObject) {
		const error = new Error("Tag not found");
		error.status = 404;
		throw error;
	}

	const tagObject = searchResult.tagObject;

	// Update the tag object with new duration and event info
	tagObject.publicData.duration = duration;
	tagObject.publicData.eventID = eventID;
	tagObject.publicData.eventPrice = eventPrice;
	tagObject.publicData.renewedAt = moment().toISOString();
	tagObject.publicData.expiresAt = moment(tagObject.publicData.expiresAt).add(duration, "year").toISOString();

	// Store updated version in IPFS
	const masterIPFSRecord = await IPFSModule.insert(
		{
			base64: Buffer.from(JSON.stringify(tagObject, null, 2)).toString("base64"),
			metadata: {
				...tagObject.publicData,
				type: "tag",
				domain,
			},
			name: `${tagName}.${domain}`,
			pinIt: true,
		},
		{ pro: true }
	);

	// Store updated version in Arweave
	const masterArweaveRecord = await ArweaveModule.insert(
		{
			base64: Buffer.from(JSON.stringify(tagObject, null, 2)).toString("base64"),
			metadata: {
				...tagObject.publicData,
				type: "tag",
				domain,
			},
			name: `${tagName}.${domain}`,
		},
		{ pro: true }
	);

	return {
		masterArweaveRecord,
		masterIPFSRecord,
	};
};

module.exports = {
	renewMyTag,
	transferMyTag,
	howToRenewMyTag,
	updateOldTagObject,
	addDurationToTag,
	// Utility functions
	getDomainConfig,
	_confirmPaymentWithCoinbase,
};
