const sessionModule = require("../../Session/modules/session.module");
const ArweaveModule = require("../../Arweave/modules/arweave.module");
const IPFSModule = require("../../IPFS/modules/ipfs.module");
const config = require("../../../Core/config");
const arweaveUrl = `https://arweave.zelf.world`;
const explorerUrl = `https://viewblock.io/arweave/tx`;
const moment = require("moment");
const axios = require("axios");

const zelfNamePricing = {
	1: { 1: 240, 2: 432, 3: 612, 4: 768, 5: 900, lifetime: 3600 },
	2: { 1: 120, 2: 216, 3: 306, 4: 384, 5: 450, lifetime: 1800 },
	3: { 1: 72, 2: 130, 3: 184, 4: 230, 5: 270, lifetime: 1080 },
	4: { 1: 36, 2: 65, 3: 92, 4: 115, 5: 135, lifetime: 540 },
	5: { 1: 30, 2: 54, 3: 76, 4: 96, 5: 112, lifetime: 450 },
	"6-15": { 1: 24, 2: 43, 3: 61, 4: 77, 5: 90, lifetime: 360 },
	16: { 1: 23, 2: 41, 3: 59, 4: 74, 5: 86, lifetime: 345 },
	17: { 1: 22, 2: 40, 3: 56, 4: 70, 5: 82, lifetime: 330 },
	18: { 1: 21, 2: 38, 3: 54, 4: 67, 5: 79, lifetime: 315 },
	19: { 1: 20, 2: 36, 3: 51, 4: 64, 5: 75, lifetime: 300 },
	20: { 1: 19, 2: 34, 3: 48, 4: 61, 5: 72, lifetime: 285 },
	21: { 1: 18, 2: 32, 3: 46, 4: 58, 5: 68, lifetime: 270 },
	22: { 1: 17, 2: 31, 3: 43, 4: 54, 5: 64, lifetime: 255 },
	23: { 1: 16, 2: 29, 3: 41, 4: 51, 5: 60, lifetime: 240 },
	24: { 1: 15, 2: 27, 3: 38, 4: 48, 5: 56, lifetime: 225 },
	25: { 1: 14, 2: 25, 3: 36, 4: 45, 5: 53, lifetime: 210 },
	26: { 1: 13, 2: 23, 3: 33, 4: 42, 5: 49, lifetime: 195 },
	27: { 1: 12, 2: 22, 3: 31, 4: 38, 5: 45, lifetime: 180 },
};

/**
 * Get Zelf Name price based on name length and duration
 * @param {number} length - The length of the Zelf name
 * @param {string} duration - Duration ("1", "2", "3", "4", "5", "lifetime")
 * @returns {number} - Price of the Zelf name
 */
const calculateZelfNamePrice = (length, duration = 1, referralZelfName) => {
	if (!["1", "2", "3", "4", "5", "lifetime"].includes(`${duration}`))
		throw new Error("Invalid duration. Use '1', '2', '3', '4', '5' or 'lifetime'.");

	let price = 24;

	if (length >= 6 && length <= 15) {
		price = zelfNamePricing["6-15"][duration];
	} else if (zelfNamePricing[length]) {
		price = zelfNamePricing[length][duration];
	} else {
		throw new Error("Invalid name length. Length must be between 1 and 27.");
	}

	// Apply 10% discount if referralZelfName is provided
	if (referralZelfName) {
		price = price - price * 0.1; // Subtract 10% from the price
	}

	// Adjust price for development environment
	price = config.env === "development" ? price / 30 : price;

	if (referralZelfName && config.token.whitelist.includes(referralZelfName)) return 0;

	// Round up to 2 decimal places
	return {
		price: Math.ceil(price * 100) / 100,
		currency: "USD",
		reward: Math.ceil((price / config.token.rewardPrice) * 100) / 100,
	};
};

const decryptParams = async (data, authUser) => {
	if (data.removePGP) {
		return {
			password: data.password,
			mnemonic: data.mnemonic,
			face: data.faceBase64,
		};
	}

	const password = await sessionModule.sessionDecrypt(data.password || null, authUser);

	const mnemonic = await sessionModule.sessionDecrypt(data.mnemonic || null, authUser);

	const face = await sessionModule.sessionDecrypt(data.faceBase64 || null, authUser);

	return { password, mnemonic, face };
};

const formatArweaveSearchResult = async (transactionRecord) => {
	const zelfNameObject = {
		id: transactionRecord.node?.id,
		url: `${arweaveUrl}/${transactionRecord.node?.id}`,
		explorerUrl: `${explorerUrl}/${transactionRecord.node?.id}`,
		publicData: {},
	};

	for (let index = 0; index < transactionRecord.node?.tags.length; index++) {
		const tag = transactionRecord.node?.tags[index];

		zelfNameObject.publicData[tag.name] = tag.value;
	}

	const zelfProofTag = transactionRecord.node?.tags.find((tag) => tag.name === "zelfProof");

	const zelfNameTag = transactionRecord.node?.tags.find((tag) => tag.name === "zelfName");

	zelfNameObject.zelfProof = zelfProofTag ? zelfProofTag.value : null;

	zelfNameObject.zelfName = zelfNameTag.value;

	zelfNameObject.zelfProofQRCode = await ArweaveModule.arweaveIDToBase64(zelfNameObject.id);

	return zelfNameObject;
};

const removeExpiredRecords = async (records) => {
	const now = moment();

	for (let index = records.length - 1; index >= 0; index--) {
		const record = records[index];

		const expiresAt = moment(record.metadata.keyvalues.expiresAt);

		const isExpired = now.isAfter(expiresAt);

		if (isExpired) {
			records.splice(index, 1);

			record.ipfs_pin_hash ? await IPFSModule.unPinFiles([record.ipfs_pin_hash]) : "do nothing";

			continue;
		}
	}
};

const formatIPFSRecord = async (ipfsRecord, foundInArweave) => {
	const zelfNameObject = {
		...ipfsRecord,
		metadata: undefined,
		publicData: {
			name: ipfsRecord.metadata.name || ipfsRecord.metadata.zelfName,
		},
		zelfName: ipfsRecord.metadata.name || ipfsRecord.metadata.zelfName,
	};

	Object.assign(zelfNameObject.publicData, ipfsRecord.metadata.keyvalues || ipfsRecord.metadata);

	if (zelfNameObject.publicData.payment) {
		const payment = JSON.parse(zelfNameObject.publicData.payment);

		// assign all payment properties to the publicData
		Object.assign(zelfNameObject.publicData, payment);

		delete zelfNameObject.publicData.payment;
	}

	if (zelfNameObject.publicData.addresses) {
		const addresses = JSON.parse(zelfNameObject.publicData.addresses);

		Object.assign(zelfNameObject.publicData, addresses);

		delete zelfNameObject.publicData.addresses;
	}

	if (!foundInArweave) {
		zelfNameObject.zelfProof = zelfNameObject.publicData.zelfProof;

		zelfNameObject.zelfProofQRCode = await _IPFSToBase64(zelfNameObject.url);
	}

	return zelfNameObject;
};

const _IPFSToBase64 = async (url) => {
	try {
		const encryptedResponse = await axios.get(url, {
			responseType: "arraybuffer",
		});

		if (encryptedResponse?.data) {
			const base64Image = Buffer.from(encryptedResponse.data).toString("base64");

			return `data:image/png;base64,${base64Image}`;
		}
	} catch (exception) {
		console.error({ VWEx: exception });

		return exception?.message;
	}
};

module.exports = {
	calculateZelfNamePrice,
	decryptParams,
	formatArweaveSearchResult,
	removeExpiredRecords,
	formatIPFSRecord,
};
