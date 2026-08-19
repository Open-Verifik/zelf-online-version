const { createBTCWallet } = require("../../Wallet/modules/btc");
const { healPublicDataXlm } = require("../../Wallet/modules/stellar");
const { generateSuiWalletFromMnemonic } = require("../../Wallet/modules/sui");
const { createTonWallet } = require("../../Wallet/modules/ton");
const { createAptosWallet } = require("../../Wallet/modules/aptos");
const { createPolkadotWallet, createKusamaWallet } = require("../../Wallet/modules/polkadot-kusama");
const SessionModule = require("../../Session/modules/session.module");
const TagsPartsModule = require("./tags-parts.module");
const TagsArweaveModule = require("./tags-arweave.module");
const TagsIPFSModule = require("./tags-ipfs.module");
const moment = require("moment");
const { getDomainConfig } = require("../config/supported-domains");
const { SEARCHABLE_ADDRESS_FIELDS, resolveEncryptVersion, stampExtraParamsVersion } = require("./tags-addresses.module");

const ADDRESS_FIELDS_HANDLED_BY_PAGES = new Set(SEARCHABLE_ADDRESS_FIELDS);

/**
 * Sync Tag Records Module for Tags
 * Placeholder module for tag record synchronization
 */
const initTagUpdates = async (tagObject, secretKeys) => {
    const { mnemonic, zkProof, solanaSecretKey, arweavePrivateKey, password } = secretKeys;

    let sui = {};
    let btc = {};

    const tagsToAdd = [];

    if (!tagObject.publicData.suiAddress) {
        sui = await generateSuiWalletFromMnemonic(mnemonic);

        tagObject.publicData.suiAddress = sui.address;

        tagsToAdd.push({ name: "suiAddress", value: sui.address, new: true });
    }

    if (!tagObject.publicData.tonAddress) {
        const ton = await createTonWallet(mnemonic);
        tagObject.publicData.tonAddress = ton.address;
        tagsToAdd.push({ name: "tonAddress", value: ton.address, new: true });
    }

    if (!tagObject.publicData.aptosAddress) {
        const aptos = await createAptosWallet(mnemonic);
        tagObject.publicData.aptosAddress = aptos.address;
        tagsToAdd.push({ name: "aptosAddress", value: aptos.address, new: true });
    }

    if (!(tagObject.publicData.btcAddress || "").startsWith("bc1")) {
        btc = createBTCWallet(mnemonic);

        tagObject.publicData.btcAddress = btc.address;

        tagsToAdd.push({ name: "btcAddress", value: btc.address, new: false });
    }

    const { stellar, shouldPersistXlm, hadXlmBeforeHeal } = healPublicDataXlm(tagObject.publicData, mnemonic);

    if (shouldPersistXlm) {
        tagsToAdd.push({ name: "xlmAddress", value: tagObject.publicData.xlmAddress, new: !hadXlmBeforeHeal });
    }

    const polkadot = await createPolkadotWallet(mnemonic);
    const kusama = await createKusamaWallet(mnemonic);

    if (!tagObject.publicData.dotAddress) {
        tagObject.publicData.dotAddress = polkadot.address;
        tagsToAdd.push({ name: "dotAddress", value: polkadot.address, new: true });
    }

    if (!tagObject.publicData.ksmAddress) {
        tagObject.publicData.ksmAddress = kusama.address;
        tagsToAdd.push({ name: "ksmAddress", value: kusama.address, new: true });
    }

    const domainConfig = getDomainConfig(tagObject.publicData.domain || "zelf");

    const walletScopeKey = TagsPartsModule.getWalletScopeKey(tagObject.publicData, domainConfig);

    const { encryptedMessage, privateKey } = await SessionModule.walletEncrypt(
        {
            mnemonic,
            zkProof,
            solanaSecretKey,
            suiSecretKey: sui.secretKey,
            stellarSecretKey: stellar.secretKey,
            arweavePrivateKey,
            substrateSecretKey: polkadot.secretKey,
        },
        walletScopeKey,
        password,
        tagObject.publicData.ethAddress
    );

    return {
        encryptedMessage,
        privateKey,
        tagsToAdd,
    };
};

const updateTags = async (tagObject, tagsToAdd) => {
    const needsPinSplit = Boolean(tagObject.publicData?._needsPinSplit);
    if ((!tagsToAdd.length && !needsPinSplit) || !tagObject.zelfProofQRCode) return {};

    const domainConfig = getDomainConfig(tagObject.publicData.domain || "zelf");

    const tagKey = domainConfig.getTagKey();

    const tagName = tagObject.publicData[tagKey];

    const zelfProofQRCode = tagObject.zelfProofQRCode || tagObject.publicData.zelfProofQRCode;

    if (!tagObject.publicData.expiresAt) tagObject.publicData.expiresAt = moment().add(1, "year").format("YYYY-MM-DD HH:mm:ss");

    const extraParams = stampExtraParamsVersion(
        {
            hasPassword: tagObject.publicData.hasPassword,
            origin: tagObject.publicData.origin || "online",
            registeredAt: moment(tagObject.publicData.registeredAt).add(30, "second").format("YYYY-MM-DD HH:mm:ss") || undefined,
            expiresAt: moment(tagObject.publicData.expiresAt).add(30, "second").format("YYYY-MM-DD HH:mm:ss") || undefined,
            price: tagObject.publicData.price || undefined,
            duration: tagObject.publicData.duration || undefined,
            referralTagName: tagObject.publicData.referralTagName || undefined,
            referralSolanaAddress: tagObject.publicData.referralSolanaAddress || undefined,
        },
        resolveEncryptVersion(tagObject.publicData)
    );

    const metadata = {
        [tagKey]: tagName,
        domain: tagObject.publicData.domain || "zelf",
        extraParams,
        type: tagObject.publicData.type || (tagName.includes("hold") ? "hold" : "mainnet"),
    };

    for (let index = 0; index < tagsToAdd.length; index++) {
        const tag = tagsToAdd[index];

        if (ADDRESS_FIELDS_HANDLED_BY_PAGES.has(tag.name)) continue;

        metadata[tag.name] = tag.value;
    }

    metadata.extraParams = JSON.stringify(metadata.extraParams);

    let arweave = {};

    await TagsIPFSModule.unpinContinuationSiblings(tagName);
    if (tagObject.id) await TagsIPFSModule.unPinFiles([tagObject.ipfsId || tagObject.id]);

    if (metadata.type === "mainnet") {
        arweave = await TagsArweaveModule.tagRegistration(zelfProofQRCode, {
            hasPassword: metadata.hasPassword,
            zelfProof: tagObject.publicData?.zelfProof,
            publicData: { ...metadata },
            fileName: tagName,
        });
    }

    const ipfs = await TagsIPFSModule.insertSearchablePins(
        {
            base64: zelfProofQRCode,
            name: tagName,
            reserved: metadata,
            addresses: tagObject.publicData,
            pinIt: true,
        },
        { pro: true },
    );

    return {
        ipfs,
        arweave,
    };
};

module.exports = {
    initTagUpdates,
    updateTags,
};
