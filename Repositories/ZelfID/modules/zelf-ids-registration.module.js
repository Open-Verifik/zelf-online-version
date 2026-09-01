/**
 * Zelf ID v4 lease-time pins. Do not call TagsRegistrationModule from here.
 */
const moment = require("moment");
const TagsIPFSModule = require("../../Tags/modules/tags-ipfs.module");
const TagsArweaveModule = require("../../Tags/modules/tags-arweave.module");
const { getDomainConfig } = require("../../Tags/config/supported-domains");
const { PINATA_KEYVALUE_MAX_LENGTH, resolveEncryptVersion, stampExtraParamsVersion } = require("../../Tags/modules/tags-addresses.module");
const { ZELF_ID_RESERVATION_HOURS, getBareName, getReservationPinName } = require("./zelf-id-plan.module");

const cleanExtraParamsForPinata = (extraParams) => {
    if (!extraParams || typeof extraParams !== "object") return extraParams;

    const cleaned = { ...extraParams };

    if (cleaned.st && typeof cleaned.st === "object") {
        const checkLength = (obj) => JSON.stringify(obj).length;

        if (checkLength(cleaned) <= PINATA_KEYVALUE_MAX_LENGTH) return cleaned;

        const { domain, ethAddress, tagName, iat, ...st1 } = cleaned.st;
        cleaned.st = st1;
        if (checkLength(cleaned) <= PINATA_KEYVALUE_MAX_LENGTH) return cleaned;

        const { ip, ...st2 } = cleaned.st;
        cleaned.st = st2;
        if (checkLength(cleaned) <= PINATA_KEYVALUE_MAX_LENGTH) return cleaned;

        const { session, ...st3 } = cleaned.st;
        cleaned.st = st3;
    }

    return cleaned;
};

const attachReferral = (metadata, referralTagObject, storageKey) => {
    if (!referralTagObject) return;

    metadata.referral = {
        tagName: referralTagObject.publicData?.[storageKey] || referralTagObject.metadata?.[storageKey],
        solanaAddress: referralTagObject.publicData?.solanaAddress || referralTagObject.metadata?.solanaAddress,
    };

    metadata.referralTagName = metadata.referral.tagName;
    metadata.referral = JSON.stringify(metadata.referral);
};

/**
 * Confirm a free-year Zelf ID (plan already resolved). IPFS always, Arweave if enabled, never Walrus.
 * @param {Object} tagObject
 * @param {Object|null} referralTagObject
 * @param {Object} domainConfig
 * @param {string} securityType
 * @param {Object} authUser
 * @param {Object} options
 * @param {"free"|"premium"|"unlimited"} options.plan
 */
const confirmZelfId = async (tagObject, referralTagObject, domainConfig, securityType, authUser, options = {}) => {
    const storageKey = domainConfig.getTagKey() || "tagName";
    const domain = tagObject.domain || "zelf";
    const tagName = `${getBareName(tagObject[storageKey] || tagObject.tagName || tagObject.zelfName)}.${domain}`;

    const extraParams = {
        origin: tagObject.origin || "online",
        price: tagObject.price,
        duration: 1,
        registeredAt: moment().format("YYYY-MM-DD HH:mm:ss"),
        expiresAt: moment().add(1, "year").format("YYYY-MM-DD HH:mm:ss"),
        type: "mainnet",
        hasPassword: tagObject.hasPassword,
        plan: options.plan,
    };

    const metadata = {
        [storageKey]: tagName,
        domain,
        extraParams: stampExtraParamsVersion(extraParams, resolveEncryptVersion(tagObject)),
    };

    if (securityType && tagObject.hasPassword == "true") {
        metadata.extraParams.st = securityType;
    }

    attachReferral(metadata, referralTagObject, storageKey);

    metadata.extraParams = JSON.stringify(cleanExtraParamsForPinata(metadata.extraParams));

    tagObject.ipfs = await TagsIPFSModule.insertSearchablePins(
        {
            base64: tagObject.zelfProofQRCode,
            name: tagName,
            reserved: metadata,
            addresses: tagObject,
            pinIt: true,
        },
        { ...authUser, pro: true }
    );

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
 * Five-hour unpaid reservation. IPFS only.
 * @param {Object} tagObject
 * @param {Object|null} referralTagObject
 * @param {Object} domainConfig
 * @param {string} securityType
 * @param {Object} authUser
 */
const reserveZelfId = async (tagObject, referralTagObject, domainConfig, securityType, authUser) => {
    const domain = tagObject.domain || "zelf";
    const _domainConfig = domainConfig || getDomainConfig(domain);
    const holdSuffix = _domainConfig?.holdSuffix || ".hold";
    const tagKey = _domainConfig.getTagKey() || "tagName";
    const holdName = getReservationPinName(tagObject[tagKey] || tagObject.tagName || tagObject.zelfName, domain, holdSuffix);

    const holdExtraParams = {
        hasPassword: tagObject.hasPassword,
        type: "hold",
        origin: tagObject.origin || "online",
        registeredAt: moment().format("YYYY-MM-DD HH:mm:ss"),
        expiresAt: moment().add(ZELF_ID_RESERVATION_HOURS, "hour").format("YYYY-MM-DD HH:mm:ss"),
    };

    if (tagObject.price !== undefined && tagObject.price !== null && tagObject.price !== "") {
        holdExtraParams.price = tagObject.price;
    }

    const metadata = {
        [tagKey]: holdName,
        domain,
        extraParams: stampExtraParamsVersion(holdExtraParams, resolveEncryptVersion(tagObject)),
    };

    if (securityType && tagObject.hasPassword == "true") {
        metadata.extraParams.st = securityType;
    }

    attachReferral(metadata, referralTagObject, tagKey);

    metadata.extraParams = JSON.stringify(cleanExtraParamsForPinata(metadata.extraParams));

    tagObject.ipfs = await TagsIPFSModule.insertSearchablePins(
        {
            base64: tagObject.zelfProofQRCode,
            name: holdName,
            reserved: metadata,
            addresses: tagObject,
            pinIt: true,
        },
        { ...authUser, pro: true }
    );
};

module.exports = {
    confirmZelfId,
    reserveZelfId,
};
