const config = require("../../../Core/config");
const pinata = require("../../../Core/ipfs");
const ZelfNameServiceModule = require("./zns.v2.module");
const TagsModule = require("../../Tags/modules/tags.module");
const myZnsModule = require("./my-zns.module");
const myTagsModule = require("../../Tags/modules/my-tags.module");

const webhookHandler = async (payload) => {
	// we going to check for the event and confirm the information
	const event = payload.event;

	console.log("event", event);

	switch (event.type) {
		case "NON_RENEWING_PURCHASE":
			// if (event.environment === "SANDBOX" && config.env === "development") {
			return await _handleWebhook(event);

		case "RENEWAL":
		case "INITIAL_PURCHASE":
			return await _handleZelfKeysSubscriptionWebhook(event);

		case "CANCELLATION":
			return await _handleZelfKeysSubscriptionCancellationWebhook(event);

		default:
			break;
	}

	const error = new Error("webhook_failed");
	error.status = 500;
	throw error;
};

/**
 * Format date to YYYY-MM-DD HH:mm:ss
 * @param {Date} date
 * @returns {string} formatted date string
 */
const formatDateTime = (date) => {
	const pad = (n) => String(n).padStart(2, "0");

	return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())} ${pad(date.getHours())}:${pad(date.getMinutes())}:${pad(
		date.getSeconds()
	)}`;
};

/**
 * Convert tagName to zelfKeys format
 * @param {string} tagName
 * @param {string} extension
 * @returns {string} converted zelfKeys format
 */
const convertToZelfKeysFormat = (tagName, extension = ".zelfkeys") => {
	if (!tagName) return tagName;

	tagName = tagName.split(".")[0];

	return `${tagName}${extension}`;
};

/**
 * Search for subscription in IPFS
 * @param {string} zelfKeysTag
 * @returns {Object|null} subscription data
 */
async function searchSubscriptionInIPFS(zelfKeysTag) {
	try {
		const files = await pinata.filter("tagName", zelfKeysTag);

		let activeSubscription = null;

		for (const element of files) {
			const keyValues = element.publicData;
			const isActiveOrCancelledActive = !keyValues.status || keyValues.status === "active" || keyValues.status === "cancelled_active";

			if (isActiveOrCancelledActive) {
				// For cancelled_active, ensure we haven't passed the end date
				if (keyValues.status === "cancelled_active" && keyValues.endDate) {
					const endDate = new Date(keyValues.endDate);

					if (endDate && endDate < new Date()) {
						// Subscription has expired
						continue;
					}
				}

				activeSubscription = {
					id: element.id,
					url: element.url,
					ipfs_pin_hash: element.ipfs_pin_hash,
					name: element.name,
					...keyValues,
					revenueCatData: keyValues.revenueCatData ? JSON.parse(keyValues.revenueCatData) : null,
				};

				break;
			}
		}

		return activeSubscription;
	} catch (error) {
		console.error("Error searching subscription in IPFS:", error);
	}

	return null;
}

/**
 * Store subscription in IPFS
 * @param {Object} subscriptionData
 * @returns {Object} IPFS result
 */
async function storeSubscriptionInIPFS(subscriptionData) {
	const ipfsResult = await pinata.pinFile(
		Buffer.from(JSON.stringify(subscriptionData)).toString("base64"),
		`${subscriptionData.tagName}.json`,
		"application/json",
		subscriptionData
	);

	if (!ipfsResult) throw new Error("failed_to_store_subscription_in_ipfs");

	return ipfsResult;
}

/**
 * Update subscription in IPFS
 * @param {string} zelfKeysTag
 * @param {Object} subscriptionData
 * @returns {Object} IPFS result
 */
async function updateSubscriptionInIPFS(zelfKeysTag, subscriptionData) {
	const ipfsResult = await pinata.pinFile(
		Buffer.from(JSON.stringify(subscriptionData)).toString("base64"),
		`${zelfKeysTag}.json`,
		"application/json",
		subscriptionData
	);

	if (!ipfsResult) throw new Error("failed_to_store_subscription_in_ipfs");

	return ipfsResult;
}

/**
 * Handle ZelfKeys subscription webhook (RENEWAL and INITIAL_PURCHASE)
 * @param {Object} event - RevenueCat webhook event
 * @returns {Object} webhook handler result
 */
const _handleZelfKeysSubscriptionWebhook = async (event) => {
	try {
		// Extract attributes from subscriber_attributes
		const attributes = {};
		const attributeKeys = Object.keys(event.subscriber_attributes || {});

		for (let index = 0; index < attributeKeys.length; index++) {
			const attributeKey = attributeKeys[index];
			attributes[attributeKey] = event.subscriber_attributes[attributeKey].value;
		}

		// Get zelfName from subscriber_attributes
		const zelfName = attributes.zelfName;

		if (!zelfName) {
			const error = new Error("zelfName_not_found_in_subscriber_attributes");
			error.status = 400;
			throw error;
		}

		// Split tagName and domain
		const extractedTagName = zelfName.split(".")[0];
		const extractedDomain = attributes.domain || zelfName.split(".")[1] || "zelf";

		if (!extractedTagName || !extractedDomain) {
			const error = new Error("invalid_zelfName_format");
			error.status = 400;
			throw error;
		}

		// Search for the tag to verify it exists
		const searchParams = {
			tagName: extractedTagName,
			domain: extractedDomain,
			environment: "all",
			type: "both",
		};

		const searchResult = await TagsModule.searchTag(searchParams, {});

		if (searchResult.available || !searchResult.tagObject) {
			const error = new Error("tag_not_found");
			error.status = 404;
			throw error;
		}

		// Verify ethAddress matches if provided
		if (attributes.ethAddress && searchResult.tagObject.publicData?.ethAddress !== attributes.ethAddress) {
			const error = new Error("zelfProof_does_not_match");
			error.status = 409;
			throw error;
		}

		// Convert to zelfKeys format
		const zelfKeysTag = convertToZelfKeysFormat(extractedTagName);

		// Check if this event was already processed
		const existingSubscription = await searchSubscriptionInIPFS(zelfKeysTag);

		if (existingSubscription?.revenueCatData?.lastProcessedEventId === event.id) {
			return {
				success: true,
				message: "webhook_already_processed",
				subscription: existingSubscription,
			};
		}

		// Calculate dates from RevenueCat event
		const purchasedAt = new Date(event.purchased_at_ms);
		const expirationAt = new Date(event.expiration_at_ms);

		// Prepare RevenueCat data
		const revenueCatData = {
			id: `${event.id}`,
			transactionId: `${event.transaction_id}`,
			// originalTransactionId: event.original_transaction_id,
			productId: `${event.product_id}`,
			// appUserId: event.app_user_id,
			// originalAppUserId: event.original_app_user_id,
			// environment: event.environment,
			store: `${event.store}`,
			price: `${event.price}`,
			priceInPurchasedCurrency: `${event.price_in_purchased_currency}`,
			currency: `${event.currency}`,
			type: `${event.type}`,
			renewalNumber: `${event.renewal_number}`,
			purchasedAt: `${formatDateTime(purchasedAt)}`,
			expirationAt: `${formatDateTime(expirationAt)}`,
			// entitlementIds: event.entitlement_ids || [],
			// lastProcessedEventId: event.id,
		};

		// Create subscription data
		const subscriptionData = {
			revenueCatData: JSON.stringify(revenueCatData),
			tagName: `${zelfKeysTag}`,
			startDate: `${formatDateTime(purchasedAt)}`,
			endDate: `${formatDateTime(expirationAt)}`,
			paymentMethod: "revenuecat",
			type: "subscription",
			status: "active",
		};

		// If existing subscription, update it; otherwise create new
		let ipfsResult;
		if (existingSubscription && existingSubscription.id) {
			// Update existing subscription
			ipfsResult = await updateSubscriptionInIPFS(zelfKeysTag, subscriptionData);

			// Delete old record if new one was created successfully
			if (ipfsResult && ipfsResult.id && existingSubscription.id) {
				try {
					await pinata.deleteFiles([existingSubscription.id]);
				} catch (deleteError) {
					console.error("Error deleting old subscription record:", deleteError);
				}
			}
		} else {
			// Create new subscription
			ipfsResult = await storeSubscriptionInIPFS(subscriptionData);
		}

		return {
			success: true,
			message: event.type === "INITIAL_PURCHASE" ? "subscription_created" : "subscription_renewed",
			ipfs: ipfsResult,
			subscription: subscriptionData,
		};
	} catch (error) {
		console.error("Error handling zelfKeys subscription webhook:", error);
		throw error;
	}
};

/**
 * Handle ZelfKeys subscription cancellation webhook
 * @param {Object} event - RevenueCat webhook event
 * @returns {Object} webhook handler result
 */
const _handleZelfKeysSubscriptionCancellationWebhook = async (event) => {
	console.log("enters into zelf keys subscription cancellation webhook");

	try {
		// Extract attributes from subscriber_attributes
		const attributes = {};
		const attributeKeys = Object.keys(event.subscriber_attributes || {});

		for (let index = 0; index < attributeKeys.length; index++) {
			const attributeKey = attributeKeys[index];
			attributes[attributeKey] = event.subscriber_attributes[attributeKey].value;
		}

		// Get zelfName from subscriber_attributes
		const zelfName = attributes.zelfName;

		if (!zelfName) {
			const error = new Error("zelfName_not_found_in_subscriber_attributes");
			error.status = 400;
			throw error;
		}

		// Split tagName and domain
		const extractedTagName = zelfName.split(".")[0];
		const extractedDomain = attributes.domain || zelfName.split(".")[1] || "zelf";

		if (!extractedTagName || !extractedDomain) {
			const error = new Error("invalid_zelfName_format");
			error.status = 400;
			throw error;
		}

		// Convert to zelfKeys format
		const zelfKeysTag = convertToZelfKeysFormat(extractedTagName);

		// Find existing subscription
		const existingSubscription = await searchSubscriptionInIPFS(zelfKeysTag);

		if (!existingSubscription) {
			return {
				success: true,
				message: "no_active_subscription_found_to_cancel",
			};
		}

		// Parse existing RevenueCat data
		const revenueCatData =
			typeof existingSubscription.revenueCatData === "string"
				? JSON.parse(existingSubscription.revenueCatData)
				: existingSubscription.revenueCatData || {};

		// Update RevenueCat data with cancellation info
		revenueCatData.status = "cancelled";
		revenueCatData.cancelledAt = formatDateTime(new Date());
		revenueCatData.cancellationEventId = event.id;
		revenueCatData.lastProcessedEventId = event.id;

		// Check if we're still within the paid period
		const expirationAt = existingSubscription.endDate ? new Date(existingSubscription.endDate) : null;
		const now = new Date();

		// If expiration is in the future, mark as cancelled_active (they keep access until expiration)
		// Otherwise, mark as cancelled
		const status = expirationAt && expirationAt > now ? "cancelled_active" : "cancelled";

		// Create updated subscription data
		const subscriptionData = {
			revenueCatData: JSON.stringify(revenueCatData),
			tagName: zelfKeysTag,
			startDate: existingSubscription.startDate || formatDateTime(new Date()),
			endDate: existingSubscription.endDate || formatDateTime(now),
			paymentMethod: "revenuecat",
			type: "subscription",
			status: status,
			cancelledAt: formatDateTime(new Date()),
			cancelAtPeriodEnd: expirationAt && expirationAt > now,
		};

		// Update subscription in IPFS
		const ipfsResult = await updateSubscriptionInIPFS(zelfKeysTag, subscriptionData);

		// Delete old record if new one was created successfully
		if (ipfsResult && ipfsResult.id && existingSubscription.id) {
			try {
				await pinata.deleteFiles([existingSubscription.id]);
			} catch (deleteError) {
				console.error("Error deleting old subscription record:", deleteError);
			}
		}

		return {
			success: true,
			message: status === "cancelled_active" ? "subscription_cancelled_will_expire_at_period_end" : "subscription_cancelled",
			ipfs: ipfsResult,
			subscription: subscriptionData,
		};
	} catch (error) {
		console.error("Error handling zelfKeys subscription cancellation webhook:", error);
		throw error;
	}
};

const _handleWebhook = async (event) => {
	const attributes = {};

	const attributeKeys = Object.keys(event.subscriber_attributes);

	for (let index = 0; index < attributeKeys.length; index++) {
		const attributeKey = attributeKeys[index];

		attributes[attributeKey] = event.subscriber_attributes[attributeKey].value;
	}

	const extractedTagName = attributes.zelfName.split(".")[0];

	const extractedDomain = attributes.domain || attributes.zelfName.split(".")[1] || "zelf";

	const previewQuery = {
		key: "zelfName",
		tagName: extractedTagName,
		environment: "both",
		domain: extractedDomain,
	};

	if (!previewQuery.tagName || !previewQuery.domain) {
		const error = new Error("zelfName_not_found");
		error.status = 404;
		throw error;
	}

	const previewResult = await TagsModule.previewTag(previewQuery, {});

	const zelfNameObject = previewResult.tagObject;

	if (zelfNameObject.publicData.eventID === event.id) {
		const error = new Error("webhook_already_processed");
		error.status = 409;
		throw error;
	}

	const preview = zelfNameObject.preview;

	zelfNameObject.publicData.duration = attributes.duration || zelfNameObject.publicData.duration || "1";

	if (zelfNameObject.publicData.ethAddress !== attributes.ethAddress) {
		const error = new Error("zelfProof_does_not_match");

		error.status = 409;
		throw error;
	}

	return myTagsModule.addDurationToTag(
		{
			tagName: extractedTagName,
			domain: extractedDomain,
			duration: attributes.duration ? Number(attributes.duration) : 1,
			eventID: event.id,
			eventPrice: event.price,
		},
		zelfNameObject
	);
};

// const _addDurationToZelfName = async (preview, zelfNameObject) => {
// 	const base64 = await ZNSPartsModule.urlToBase64(zelfNameObject.url);

// const ethAddress = preview.publicData.ethAddress || zelfNameObject.publicData.ethAddress;
// const solanaAddress = preview.publicData.solanaAddress || zelfNameObject.publicData.solanaAddress;
// const btcAddress = preview.publicData.btcAddress || zelfNameObject.publicData.btcAddress;
// const suiAddress = preview.publicData.suiAddress || zelfNameObject.publicData.suiAddress || "";
// const origin = preview.publicData.origin || zelfNameObject.publicData.origin || "offline";
// const duration = zelfNameObject.publicData.duration;
// const zelfName = zelfNameObject.publicData.zelfName || zelfNameObject.publicData.zelfName.replace(".hold", "");

// 	const payload = {
// 		base64,
// 		name: zelfName.replace(".hold", ""),
// 		metadata: {
// 			hasPassword: zelfNameObject.publicData.hasPassword,
// 			zelfProof: zelfNameObject.publicData.zelfProof,
// 			zelfName,
// 			ethAddress,
// 			solanaAddress,
// 			btcAddress,
// 			extraParams: JSON.stringify({
// 				suiAddress,
// 				origin,
// 				registeredAt:
// 					zelfNameObject.publicData.type === "mainnet" ? zelfNameObject.publicData.registeredAt : moment().format("YYYY-MM-DD HH:mm:ss"),
// 				renewedAt: zelfNameObject.publicData.type === "mainnet" ? moment().format("YYYY-MM-DD HH:mm:ss") : undefined,
// 				expiresAt: moment(zelfNameObject.publicData.expiresAt).add(duration, "year").format("YYYY-MM-DD HH:mm:ss"),
// 				count: parseInt(zelfNameObject.publicData.count) + 1,
// 			}),
// 			type: "mainnet",
// 		},
// 		pinIt: true,
// 	};

// 	const masterArweaveRecord = await ArweaveModule.zelfNameRegistration(base64, {
// 		hasPassword: payload.metadata.hasPassword,
// 		zelfProof: payload.metadata.zelfProof,
// 		publicData: payload.metadata,
// 	});
// };

module.exports = {
	webhookHandler,
};
