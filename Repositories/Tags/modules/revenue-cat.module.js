const config = require("../../../Core/config");
const TagsModule = require("./tags.module");
const MyTagsModule = require("./my-tags.module");

const webhookHandler = async (payload) => {
	// we going to check for the event and confirm the information
	const event = payload.event;

	switch (event.type) {
		case "NON_RENEWING_PURCHASE":
			// if (event.environment === "SANDBOX" && config.env === "development") {
			return await _handleWebhook(event);
			// }

			// if (event.environment === "PRODUCTION" && config.env === "production") {
			// return await _handleWebhook(event);
			// }
			break;

		default:
			break;
	}

	const error = new Error("webhook_failed");
	error.status = 500;
	throw error;
};

const _handleWebhook = async (event) => {
	const attributes = {};

	const attributeKeys = Object.keys(event.subscriber_attributes);

	for (let index = 0; index < attributeKeys.length; index++) {
		const attributeKey = attributeKeys[index];

		attributes[attributeKey] = event.subscriber_attributes[attributeKey].value;
	}

	const previewQuery = {
		key: "tagName",
		value: attributes.tagName,
		domain: attributes.domain || "zelf",
		environment: "both",
	};

	if (!previewQuery.value) {
		const error = new Error("tagName_not_found");
		error.status = 404;
		throw error;
	}

	const previewResult = await TagsModule.previewTag(previewQuery, {});

	const tagRecords = previewResult.arweave ? previewResult.arweave : previewResult.ipfs ? previewResult.ipfs : previewResult;

	console.log({ event, tagRecords, previewQuery, previewResult });

	if (!tagRecords.length) {
		const error = new Error("tagName_not_found");
		error.status = 404;
		throw error;
	}

	const tagObject = tagRecords[0];

	if (tagObject.publicData.eventID === event.id) {
		const error = new Error("webhook_already_processed");
		error.status = 409;
		throw error;
	}

	const preview = tagObject.preview;

	tagObject.publicData.duration = attributes.duration || tagObject.publicData.duration || "1";

	if (preview.publicData.ethAddress !== attributes.ethAddress) {
		const error = new Error("zelfProof_does_not_match");

		error.status = 409;
		throw error;
	}

	const { masterArweaveRecord, masterIPFSRecord } = await MyTagsModule.addDurationToTag(
		{
			tagName: tagObject.publicData.tagName,
			domain: tagObject.publicData.domain || "zelf",
			duration: tagObject.publicData.duration,
			eventID: event.id,
			eventPrice: event.price,
		},
		preview
	);

	return {
		renewed: true,
		ipfs: [masterIPFSRecord],
		arweave: [masterArweaveRecord],
	};
};

// const _addDurationToTag = async (preview, tagObject) => {
// 	const base64 = await TagsPartsModule.urlToBase64(tagObject.url);

// const ethAddress = preview.publicData.ethAddress || tagObject.publicData.ethAddress;
// const solanaAddress = preview.publicData.solanaAddress || tagObject.publicData.solanaAddress;
// const btcAddress = preview.publicData.btcAddress || tagObject.publicData.btcAddress;
// const suiAddress = preview.publicData.suiAddress || tagObject.publicData.suiAddress || "";
// const origin = preview.publicData.origin || tagObject.publicData.origin || "offline";
// const duration = tagObject.publicData.duration;
// const tagName = tagObject.publicData.tagName || tagObject.publicData.tagName.replace(".hold", "");

// 	const payload = {
// 		base64,
// 		name: tagName.replace(".hold", ""),
// 		metadata: {
// 			hasPassword: tagObject.publicData.hasPassword,
// 			zelfProof: tagObject.publicData.zelfProof,
// 			tagName,
// 			domain: tagObject.publicData.domain || "zelf",
// 			ethAddress,
// 			solanaAddress,
// 			btcAddress,
// 			extraParams: JSON.stringify({
// 				suiAddress,
// 				origin,
// 				registeredAt:
// 					tagObject.publicData.type === "mainnet" ? tagObject.publicData.registeredAt : moment().format("YYYY-MM-DD HH:mm:ss"),
// 				renewedAt: tagObject.publicData.type === "mainnet" ? moment().format("YYYY-MM-DD HH:mm:ss") : undefined,
// 				expiresAt: moment(tagObject.publicData.expiresAt).add(duration, "year").format("YYYY-MM-DD HH:mm:ss"),
// 				count: parseInt(tagObject.publicData.count) + 1,
// 			}),
// 			type: "mainnet",
// 		},
// 		pinIt: true,
// 	};

// 	const masterArweaveRecord = await ArweaveModule.tagRegistration(base64, {
// 		hasPassword: payload.metadata.hasPassword,
// 		zelfProof: payload.metadata.zelfProof,
// 		publicData: payload.metadata,
// 	});
// };

module.exports = {
	webhookHandler,
};
