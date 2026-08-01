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
const { buildAddressKeyvalues } = require("./tags-addresses.module");

/**
 * Address fields are packed into chunked keyvalues by `buildAddressKeyvalues`,
 * not stored as standalone Pinata keyvalues. Anything in this set must NOT be
 * promoted to a top-level metadata key by the `tagsToAdd` loop below.
 */
const ADDRESS_FIELDS_HANDLED_BY_BUNDLE = new Set([
    "ethAddress",
    "solanaAddress",
    "btcAddress",
    "arweaveAddress",
    "suiAddress",
    "xlmAddress",
    "dotAddress",
    "ksmAddress",
    "tonAddress",
    "aptosAddress",
]);

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
    if (!tagsToAdd.length || !tagObject.zelfProofQRCode) return {};

    const domainConfig = getDomainConfig(tagObject.publicData.domain || "zelf");

    const tagKey = domainConfig.getTagKey();

    const tagName = tagObject.publicData[tagKey];

    const zelfProofQRCode = tagObject.zelfProofQRCode || tagObject.publicData.zelfProofQRCode;

    if (!tagObject.publicData.expiresAt) tagObject.publicData.expiresAt = moment().add(1, "year").format("YYYY-MM-DD HH:mm:ss");

    const extraParams = {
        hasPassword: tagObject.publicData.hasPassword,
        origin: tagObject.publicData.origin || "online",
        registeredAt: moment(tagObject.publicData.registeredAt).add(30, "second").format("YYYY-MM-DD HH:mm:ss") || undefined,
        expiresAt: moment(tagObject.publicData.expiresAt).add(30, "second").format("YYYY-MM-DD HH:mm:ss") || undefined,
        price: tagObject.publicData.price || undefined,
        duration: tagObject.publicData.duration || undefined,
        referralTagName: tagObject.publicData.referralTagName || undefined,
        referralSolanaAddress: tagObject.publicData.referralSolanaAddress || undefined,
    };

    const metadata = {
        [tagKey]: tagName,
        extraParams,
        type: tagObject.publicData.type || (tagName.includes("hold") ? "hold" : "mainnet"),
    };

    for (let index = 0; index < tagsToAdd.length; index++) {
        const tag = tagsToAdd[index];

        // Address fields are folded into the chunked address keyvalues below,
        // so they must not be added as top-level metadata keys.
        if (ADDRESS_FIELDS_HANDLED_BY_BUNDLE.has(tag.name)) continue;

        metadata[tag.name] = tag.value;
    }

    Object.assign(metadata, buildAddressKeyvalues(tagObject.publicData));

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
