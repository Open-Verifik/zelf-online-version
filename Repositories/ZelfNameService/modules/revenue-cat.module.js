const config = require("../../../Core/config");
const ZelfNameServiceModule = require("./zns.v2.module");

const myZnsModule = require("./my-zns.module");

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

	const zelfNameRecords = await ZelfNameServiceModule.previewZelfName({ zelfName: attributes.zelfName, environment: "both" }, {});

	if (!zelfNameRecords.length) {
		const error = new Error("zelfName_not_found");
		error.status = 404;
		throw error;
	}

	const zelfNameObject = zelfNameRecords[0];

	if (zelfNameObject.publicData.eventID === event.id) {
		const error = new Error("webhook_already_processed");
		error.status = 409;
		throw error;
	}

	const preview = zelfNameObject.preview;

	zelfNameObject.publicData.duration = attributes.duration || zelfNameObject.publicData.duration || "1";

	if (preview.publicData.ethAddress !== attributes.ethAddress) {
		const error = new Error("zelfProof_does_not_match");

		error.status = 409;
		throw error;
	}

	const { masterArweaveRecord, masterIPFSRecord } = await myZnsModule.addDurationToZelfName(
		{
			zelfName: zelfNameObject.publicData.zelfName,
			duration: zelfNameObject.publicData.duration,
			eventID: event.id,
			eventPRice: event.price,
		},
		preview
	);

	return {
		renewed: true,
		ipfs: [masterIPFSRecord],
		arweave: [masterArweaveRecord],
	};
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
