const ZelfIdModule = require("./zelf-id.module");
const ZelfIdPartsModule = require("./zelf-id-parts.module");
const { decrypt } = require("../../ZelfProof/modules/zelf-proof.module");
const { getDomainConfig } = require("../../Tags/config/supported-domains");
const TagsRegistrationModule = require("../../Tags/modules/tags-registration.module");

const withV4 = (data) => ({ ...data, stack: "v4" });

/**
 * Re-lease from an existing proof (import onto a name). Always v4.
 *
 * Inbound after Joi: `zelfProof`, `tagName`, `domain`, `faceBase64`, `password`, `os` required.
 * Optional: `addServerPassword`, `referralTagName`, `tolerance`, `duration`, `removePGP`, `captchaToken`.
 *
 * @param {Object} payload
 * @param {Object} authUser
 * @returns {Promise<Object>}
 */
const leaseRecovery = async (payload, authUser) => {
    const { zelfProof, tagName, domain, type, os, addServerPassword, referralTagName } = payload;

    const duration = payload.duration || 1;

    const domainConfig = getDomainConfig(domain);

    const zelfProofRecord = await ZelfIdModule.searchTag({ key: "zelfProof", value: zelfProof, domain, domainConfig }, authUser);

    if (zelfProofRecord?.tagObject) {
        return { ...zelfProofRecord.tagObject, message: "Zelf Proof found and is being used by another tag" };
    }

    await ZelfIdModule._findDuplicatedTag(tagName, domain, domainConfig);

    const { face, password } = await ZelfIdPartsModule.decryptParams(payload, authUser);

    const decryptedZelfProof = await decrypt(
        withV4({
            addServerPassword: Boolean(addServerPassword),
            faceBase64: face,
            password,
            zelfProof,
            os: os || "DESKTOP",
        })
    );

    const referralTagObject = await ZelfIdModule._validateReferral(referralTagName, authUser, domainConfig);

    const { eth, btc, solana, sui, stellar, polkadot, kusama, ton, aptos, zkProof, mnemonic, arweave } = await ZelfIdModule._createWalletsFromPhrase({
        faceBase64: face,
        password,
        type: "import",
        mnemonic: decryptedZelfProof.metadata.mnemonic,
    });

    const tagKey = domainConfig.getTagKey();

    const dataToEncrypt = {
        publicData: {
            ethAddress: eth.address,
            solanaAddress: solana.address,
            btcAddress: btc.address,
            stellarAddress: stellar.address,
            [tagKey]: tagName,
            domain: domain,
            origin: "online",
            v: "4",
        },
        metadata: {
            mnemonic,
            solanaSecretKey: solana.secretKey,
        },
        faceBase64: face,
        password,
        _id: tagName,
        tolerance: payload.tolerance,
        addServerPassword: Boolean(payload.addServerPassword),
    };

    const tagObject = {
        ...dataToEncrypt.publicData,
        duration,
        origin: "online",
        v: "4",
    };

    const skipZelfProof = decryptedZelfProof.publicData[tagKey] === tagName;

    ZelfIdPartsModule.assignProperties(
        tagObject,
        dataToEncrypt,
        { eth, btc, solana, sui, stellar, arweave, polkadot, kusama, ton, aptos },
        { ...payload, password, referralTagObject },
        domainConfig
    );

    await ZelfIdPartsModule.generateZelfProof(dataToEncrypt, tagObject);

    tagObject.zelfProof = skipZelfProof ? zelfProof : tagObject.zelfProof;

    const securityType = password ? (/^\d{6}$/.test(password) ? "pin" : "password") : null;

    if (tagObject.price === 0) {
        await TagsRegistrationModule.confirmFreeTag(tagObject, referralTagObject, domainConfig, securityType, authUser);
    } else {
        await TagsRegistrationModule.saveHoldTagInIPFS(tagObject, referralTagObject, domainConfig, securityType, authUser);
    }

    const pgp = await ZelfIdPartsModule.generatePGPKeys(
        dataToEncrypt,
        { eth, btc, solana, sui, stellar, arweave, polkadot, kusama, ton, aptos },
        password
    );

    return {
        ipfs: [tagObject.ipfs],
        available: false,
        name: tagName,
        tagName: `${tagName}.${domain}`,
        domain,
        arweave: tagObject.arweave ? [tagObject.arweave] : [],
        tagObject: {
            ...tagObject.ipfs,
            zelfProof: tagObject.zelfProof,
            zelfProofQRCode: tagObject.zelfProofQRCode,
        },
        pgp,
    };
};

module.exports = {
    leaseRecovery,
};
