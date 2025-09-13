const { createBTCWallet } = require("../../Wallet/modules/btc");
const { generateSuiWalletFromMnemonic } = require("../../Wallet/modules/sui");
const SessionModule = require("../../Session/modules/session.module");
const TagsArweaveModule = require("./tags-arweave.module");
const TagsIPFSModule = require("./tags-ipfs.module");
const moment = require("moment");
const { getDomainConfig } = require("../config/supported-domains");

/**
 * Sync Tag Records Module for Tags
 * Placeholder module for tag record synchronization
 */
const initTagUpdates = async (tagObject, secretKeys) => {
	const { mnemonic, zkProof, solanaSecretKey, password } = secretKeys;
	let sui = {};
	let btc = {};

	const tagsToAdd = [];

	if (!tagObject.publicData.suiAddress) {
		sui = await generateSuiWalletFromMnemonic(mnemonic);

		tagObject.publicData.suiAddress = sui.address;

		tagsToAdd.push({ name: "suiAddress", value: sui.address, new: true });
	}

	if (!tagObject.publicData.btcAddress.startsWith("bc1")) {
		btc = createBTCWallet(mnemonic);

		tagObject.publicData.btcAddress = btc.address;

		tagsToAdd.push({ name: "btcAddress", value: btc.address, new: false });
	}

	const { encryptedMessage, privateKey } = await SessionModule.walletEncrypt(
		{ mnemonic, zkProof, solanaSecretKey, suiSecretKey: sui.secretKey },
		tagObject.publicData.ethAddress,
		password
	);

	return {
		encryptedMessage,
		privateKey,
		tagsToAdd,
	};
};

const updateTags = async (tagObject, tagsToAdd) => {
	if (!tagsToAdd.length || !tagObject.zelfProofQRCode) return {};

	const domainConfig = getDomainConfig(tagObject.publicData.domain || "zelf");

	const tagKey = domainConfig.getTagKey();

	const tagName = tagObject.publicData[tagKey];

	const zelfProof = tagObject.zelfProof || tagObject.publicData.zelfProof;

	const zelfProofQRCode = tagObject.zelfProofQRCode || tagObject.publicData.zelfProofQRCode;

	const extraParams = {
		hasPassword: tagObject.publicData.hasPassword,
		origin: tagObject.publicData.origin || "online",
		suiAddress: tagObject.publicData.suiAddress || undefined,
		registeredAt: moment(tagObject.publicData.registeredAt).add(30, "second").format("YYYY-MM-DD HH:mm:ss") || undefined,
		expiresAt: moment(tagObject.publicData.expiresAt).add(30, "second").format("YYYY-MM-DD HH:mm:ss") || undefined,
		price: tagObject.publicData.price || undefined,
		duration: tagObject.publicData.duration || undefined,
		referralTagName: tagObject.publicData.referralTagName || undefined,
		referralSolanaAddress: tagObject.publicData.referralSolanaAddress || undefined,
	};

	const metadata = {
		zelfProof,
		[tagKey]: tagName,
		ethAddress: tagObject.publicData.ethAddress || undefined,
		btcAddress: tagObject.publicData.btcAddress || undefined,
		solanaAddress: tagObject.publicData.solanaAddress || undefined,
		extraParams,
		type: tagObject.publicData.type || (tagName.includes("hold") ? "hold" : "mainnet"),
	};

	for (let index = 0; index < tagsToAdd.length; index++) {
		const tag = tagsToAdd[index];

		if (tag.name === "suiAddress") {
			metadata.extraParams.suiAddress = tag.value;

			continue;
		}

		metadata[tag.name] = tag.value;
	}

	metadata.extraParams = JSON.stringify(metadata.extraParams);

	let arweave = {};

	// unpin the current IPFS hash
	if (tagObject.ipfsHash || tagObject.ipfs_pin_hash) {
		await TagsIPFSModule.unPinFiles([tagObject.ipfsHash || tagObject.ipfs_pin_hash]);
	}

	const ipfs = await TagsIPFSModule.tagRegistration(
		{
			base64: zelfProofQRCode,
			name: tagName,
			metadata,
			pinIt: true,
		},
		{ pro: true }
	);

	if (metadata.type === "mainnet") {
		// save in Arweave as well
		arweave = await TagsArweaveModule.tagRegistration(zelfProofQRCode, {
			hasPassword: metadata.hasPassword,
			zelfProof: metadata.zelfProof,
			publicData: metadata,
			fileName: tagName,
		});
	}

	return {
		ipfs,
		arweave,
	};
};

module.exports = {
	initTagUpdates,
	updateTags,
};
