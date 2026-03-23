const { createBTCWallet } = require("../../Wallet/modules/btc");
const { healPublicDataXlm } = require("../../Wallet/modules/stellar");
const { generateSuiWalletFromMnemonic } = require("../../Wallet/modules/sui");
const SessionModule = require("../../Session/modules/session.module");
const TagsPartsModule = require("./tags-parts.module");
const TagsArweaveModule = require("./tags-arweave.module");
const TagsIPFSModule = require("./tags-ipfs.module");
const moment = require("moment");
const { getDomainConfig } = require("../config/supported-domains");

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

    if (!(tagObject.publicData.btcAddress || "").startsWith("bc1")) {
        btc = createBTCWallet(mnemonic);

        tagObject.publicData.btcAddress = btc.address;

        tagsToAdd.push({ name: "btcAddress", value: btc.address, new: false });
    }

    const { stellar, shouldPersistXlm, hadXlmBeforeHeal } = healPublicDataXlm(tagObject.publicData, mnemonic);

    if (shouldPersistXlm) {
        tagsToAdd.push({ name: "xlmAddress", value: tagObject.publicData.xlmAddress, new: !hadXlmBeforeHeal });
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
    if (!tagsToAdd.length || !tagObject.zelfProofQRCode) return {};

    const domainConfig = getDomainConfig(tagObject.publicData.domain || "zelf");

    const tagKey = domainConfig.getTagKey();

    const tagName = tagObject.publicData[tagKey];

    const zelfProofQRCode = tagObject.zelfProofQRCode || tagObject.publicData.zelfProofQRCode;

    if (!tagObject.publicData.expiresAt) tagObject.publicData.expiresAt = moment().add(1, "year").format("YYYY-MM-DD HH:mm:ss");

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

    const addressBundle = Object.fromEntries(
        Object.entries({
            arweaveAddress: tagObject.publicData.arweaveAddress,
            suiAddress: tagObject.publicData.suiAddress,
            xlmAddress: tagObject.publicData.xlmAddress,
        }).filter(([, v]) => typeof v === "string" && v.trim())
    );

    if (Object.keys(addressBundle).length) {
        metadata.addresses = JSON.stringify(addressBundle);
    }

    metadata.extraParams = JSON.stringify(metadata.extraParams);

    let arweave = {};

    // unpin the current IPFS hash
    if (tagObject.id) await TagsIPFSModule.unPinFiles([tagObject.ipfsId || tagObject.id]);

    if (metadata.type === "mainnet") {
        // save in Arweave as well
        arweave = await TagsArweaveModule.tagRegistration(zelfProofQRCode, {
            hasPassword: metadata.hasPassword,
            zelfProof: tagObject.publicData?.zelfProof,
            publicData: { ...metadata },
            fileName: tagName,
        });
    }

    const ipfs = await TagsIPFSModule.tagRegistration(
        {
            base64: zelfProofQRCode,
            name: tagName,
            metadata,
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
