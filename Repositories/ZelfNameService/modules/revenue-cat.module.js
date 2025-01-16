const config = require("../../../Core/config");
const ZelfNameServiceModule = require("./zns.module");
const IPFSModule = require("../../IPFS/modules/ipfs.module");

const webhookHandler = async (payload) => {
	// we going to check for the event and confirm the information
	const event = payload.event;

	switch (event.type) {
		case "NON_RENEWING_PURCHASE":
			if (event.environment === "SANDBOX" && config.env === "development") {
				return await _handleWebhook(event);
			}

			if (event.environment === "PRODUCTION" && config.env === "production") {
				return await _handleWebhook(event);
			}
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
	let inMainnet = false;
	const attributeKeys = Object.keys(event.subscriber_attributes);

	for (let index = 0; index < attributeKeys.length; index++) {
		const attributeKey = attributeKeys[index];

		attributes[attributeKey] = event.subscriber_attributes[attributeKey].value;
	}

	const zelfNameRecords = await ZelfNameServiceModule.previewZelfName({ zelfName: attributes.zelfName, environment: "both" }, {});

	for (let index = 0; index < zelfNameRecords.length; index++) {
		const record = zelfNameRecords[index];

		inMainnet = Boolean(record.publicData?.type === "mainnet" || !record.publicData?.zelfName.includes(".hold"));
	}

	if (!zelfNameRecords.length) {
		const error = new Error("zelfName_not_found");
		error.status = 404;
		throw error;
	}

	if (zelfNameRecords.length === 2 || inMainnet) {
		const error = new Error("zelfName_purchased_already");
		error.status = 409;
		throw error;
	}

	const zelfNameObject = zelfNameRecords[0];
	const matchDuration = Boolean(zelfNameObject.publicData.duration == attributes.duration);
	const preview = zelfNameObject.preview;

	if (preview.publicData.ethAddress !== attributes.ethAddress || !matchDuration) {
		const error = new Error("zelfProof_does_not_match");
		error.status = 409;
		throw error;
	}

	unpinResult = await IPFSModule.unPinFiles([zelfNameObject.ipfs_pin_hash]);

	const { masterIPFSRecord, masterArweaveRecord } = await ZelfNameServiceModule.saveInProduction(zelfNameObject);

	return {
		ipfs: [masterIPFSRecord],
		arweave: [masterArweaveRecord],
	};
};

module.exports = {
	webhookHandler,
};
