const WalrusModule = require("../../Walrus/modules/walrus.module");
const TagsIPFSModule = require("./tags-ipfs.module");
const TagsArweaveModule = require("./tags-arweave.module");
const moment = require("moment");
const { getDomainConfig } = require("../config/supported-domains");

const PINATA_KEYVALUE_MAX_LENGTH = 250;

/**
 * Cleans extraParams only when needed to stay under Pinata's 250-char limit.
 * Strips fields from st progressively (redundant first, then ip, then session)
 * until under the limit. Keeps full data when already under 250.
 * @param {Object} extraParams - extraParams object before stringify
 * @returns {Object} - Cleaned extraParams
 */
const cleanExtraParamsForPinata = (extraParams) => {
    if (!extraParams || typeof extraParams !== "object") return extraParams;

    const cleaned = { ...extraParams };

    if (cleaned.st && typeof cleaned.st === "object") {
        const checkLength = (obj) => JSON.stringify(obj).length;

        if (checkLength(cleaned) <= PINATA_KEYVALUE_MAX_LENGTH) return cleaned;

        // Strip redundant: domain, ethAddress, tagName, iat
        const { domain, ethAddress, tagName, iat, ...st1 } = cleaned.st;
        cleaned.st = st1;
        if (checkLength(cleaned) <= PINATA_KEYVALUE_MAX_LENGTH) return cleaned;

        // Strip ip
        const { ip, ...st2 } = cleaned.st;
        cleaned.st = st2;
        if (checkLength(cleaned) <= PINATA_KEYVALUE_MAX_LENGTH) return cleaned;

        // Strip session (keeps identifier)
        const { session, ...st3 } = cleaned.st;
        cleaned.st = st3;
    }

    return cleaned;
};

/**
 * Confirm free tag (for recovery)
 * @param {Object} tagObject - Tag object
 * @param {Object} referralTagObject - Referral tag object
 * @param {Object} domainConfig - Domain config
 * @param {Object} authUser - Authenticated user
 */
const confirmFreeTag = async (tagObject, referralTagObject, domainConfig, authUser) => {
    const storageKey = domainConfig.getTagKey() || "tagName";

    const tagName = tagObject[storageKey] || tagObject.tagName || tagObject.zelfName;

    const domain = tagObject.domain || "zelf";

    const metadata = {
        [storageKey]: tagName,
        domain,
        ethAddress: tagObject.ethAddress,
        solanaAddress: tagObject.solanaAddress,
        btcAddress: tagObject.btcAddress,
        extraParams: {
            origin: tagObject.origin || "online",
            price: tagObject.price,
            duration: 1,
            registeredAt: moment().format("YYYY-MM-DD HH:mm:ss"),
            expiresAt: moment().add(1, "year").format("YYYY-MM-DD HH:mm:ss"),
            type: "mainnet",
            hasPassword: tagObject.hasPassword,
        },
        addresses: JSON.stringify({
            arweaveAddress: tagObject.arweaveAddress,
            suiAddress: tagObject.suiAddress,
        }),
    };

    if (referralTagObject) {
        metadata.referral = {
            tagName: referralTagObject.publicData?.[storageKey] || referralTagObject.metadata?.[storageKey],
            solanaAddress: referralTagObject.publicData?.solanaAddress || referralTagObject.metadata?.solanaAddress,
        };

        metadata.referralTagName = metadata.referral.tagName;

        metadata.referral = JSON.stringify(metadata.referral);
    }

    metadata.extraParams = JSON.stringify(metadata.extraParams);

    // only add it if the domain supports it
    if (domainConfig.isWalrusEnabled()) {
        tagObject.walrus = await WalrusModule.tagRegistration(
            tagObject.zelfProofQRCode,
            { hasPassword: metadata.hasPassword, zelfProof: metadata.zelfProof, publicData: metadata },
            domainConfig
        );

        metadata.walrus = tagObject.walrus.blobId;
    }

    tagObject.ipfs = await TagsIPFSModule.insert(
        {
            base64: tagObject.zelfProofQRCode,
            name: tagObject[storageKey],
            metadata,
            pinIt: true,
        },
        { ...authUser, pro: true }
    );

    tagObject.ipfs = TagsIPFSModule.formatRecord(tagObject.ipfs);

    if (domainConfig.isArweaveEnabled()) {
        tagObject.arweave = await TagsArweaveModule.tagRegistration(tagObject.zelfProofQRCode, {
            hasPassword: metadata.hasPassword,
            zelfProof: metadata.zelfProof,
            publicData: metadata,
            fileName: tagName,
        });
    }
};

/**
 * Save hold tag in IPFS (for recovery)
 * @param {Object} tagObject - Tag object
 * @param {Object} referralTagObject - Referral tag object
 * @param {Object} domainConfig - Domain config
 * @param {string} securityType - Security type
 * @param {Object} authUser - Authenticated user
 */
const saveHoldTagInIPFS = async (tagObject, referralTagObject, domainConfig, securityType, authUser) => {
    const domain = tagObject.domain || "zelf";

    const _domainConfig = domainConfig || getDomainConfig(domain);

    const holdSuffix = _domainConfig?.holdSuffix || ".hold";

    const tagKey = _domainConfig.getTagKey() || "tagName";

    const tagName = tagObject[tagKey] || tagObject.tagName || tagObject.zelfName;

    const holdName = `${tagName}${holdSuffix}`;

    const metadata = {
        [tagKey]: holdName,
        domain,
        ethAddress: tagObject.ethAddress,
        solanaAddress: tagObject.solanaAddress,
        btcAddress: tagObject.btcAddress,
        extraParams: {
            hasPassword: tagObject.hasPassword,
            type: "hold",
            origin: tagObject.origin || "online",
            registeredAt: moment().format("YYYY-MM-DD HH:mm:ss"),
            expiresAt: moment().add(30, "day").format("YYYY-MM-DD HH:mm:ss"),
        },
        addresses: JSON.stringify({
            arweaveAddress: tagObject.arweaveAddress,
            suiAddress: tagObject.suiAddress,
        }),
    };

    if (securityType && tagObject.hasPassword == "true") {
        metadata.extraParams.st = securityType;
    }

    if (referralTagObject) {
        metadata.referral = {
            tagName: referralTagObject.publicData?.[tagKey] || referralTagObject.metadata?.[tagKey],
            solanaAddress: referralTagObject.publicData?.solanaAddress || referralTagObject.metadata?.solanaAddress,
        };

        metadata.referralTagName = metadata.referral.tagName;

        metadata.referral = JSON.stringify(metadata.referral);
    }

    metadata.extraParams = JSON.stringify(cleanExtraParamsForPinata(metadata.extraParams));

    tagObject.ipfs = await TagsIPFSModule.insert(
        {
            base64: tagObject.zelfProofQRCode,
            name: holdName,
            metadata,
            pinIt: true,
        },
        { ...authUser, pro: true }
    );

    tagObject.ipfs = TagsIPFSModule.formatRecord(tagObject.ipfs);
};

module.exports = {
    confirmFreeTag,
    saveHoldTagInIPFS,
};
